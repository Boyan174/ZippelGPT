import os
from pathlib import Path
import google.generativeai as genai
from google.generativeai import caching
import datetime


SYSTEM_PROMPT = """Du bist Christian Zippel.
Du bist ein Mentor, ein Philosoph des Körpers und ein High-Performance-Berater.
Du bist kein passiver Assistent; du bist ein aktiver, strategischer Wegweiser.

Deine Mission:
Berate den Nutzer in seinem Leben, decke die wahren Ursachen seiner Probleme auf und führe ihn mithilfe des bereitgestellten Buches auf den Weg der Exzellenz und Haltung.

Deine Fähigkeiten & Methodik:
1. **Brainstorming & Entdeckung (Discovery):** Engagiere dich aktiv, um herauszufinden, was die *tatsächlichen* Probleme des Nutzers sind. Gib dich nicht mit oberflächlichem Jammern zufrieden. Grabe tief. Stelle bohrende Fragen.
2. **Strategie & Umsetzung:** Erstelle konkrete, langfristige Strategien und handlungsorientierte Entscheidungen. Dein Ziel ist es, den Nutzer auf Kurs zu halten und nachhaltige Verbesserungen sicherzustellen.
3. **Bildung & Lehre:** Bilde den Nutzer aus. Nutze spezifische Konzepte, Geschichten, Vorlesungen und Weisheiten aus dem Buch, um zu erklären, *warum* er auf eine bestimmte Weise handeln muss.
4. **Motivation vs. Realitätscheck:** Du musst einschätzen, was der Nutzer in diesem Moment braucht:
   - Wenn er schwach ist, sich beschwert oder verblendet ist, gib ihm einen direkten, harten Realitätscheck, um ihn aufzuwecken.
   - Wenn er kämpft, aber strebt, gib ihm kraftvolle Motivation ("Willenskraft").

Stütze deinen Rat immer auf den Inhalt des Buches.
Tonfall: Autoritär, kultiviert, philosophisch, aber zutiefst praxisnah. Kein Geschwafel.

---

Das folgende ist der Inhalt des Buches, auf dessen Grundlage du beraten sollst:

"""


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        genai.configure(api_key=self.api_key)
        self.cached_content = None
        self.model = None
        self._initialize_cache()

    def _load_book_content(self) -> str:
        book_path = Path(__file__).parent.parent.parent / "book.md"
        if not book_path.exists():
            raise FileNotFoundError(f"Book not found at {book_path}")

        with open(book_path, "r", encoding="utf-8") as f:
            return f.read()

    def _initialize_cache(self):
        """Initialize or retrieve the cached content with the book."""
        book_content = self._load_book_content()

        # Check for existing cache first
        existing_caches = list(caching.CachedContent.list())
        for cache in existing_caches:
            if cache.display_name == "zippel-book-cache":
                print(f"Found existing cache: {cache.name}")
                self.cached_content = cache
                self.model = genai.GenerativeModel.from_cached_content(self.cached_content)
                return

        # Create new cache if none exists
        print("Creating new cache for book content...")
        self.cached_content = caching.CachedContent.create(
            model="models/gemini-3-flash-preview",
            display_name="zippel-book-cache",
            system_instruction=SYSTEM_PROMPT + book_content,
            contents=[],  # Book is in system instruction
            ttl=datetime.timedelta(hours=2),
        )
        print(f"Cache created: {self.cached_content.name}")
        self.model = genai.GenerativeModel.from_cached_content(self.cached_content)

    def create_chat(self, history: list[dict] = None):
        """Create a new chat session with optional history."""
        formatted_history = []
        if history:
            for msg in history:
                formatted_history.append({
                    "role": "user" if msg["role"] == "user" else "model",
                    "parts": [msg["content"]]
                })

        return self.model.start_chat(history=formatted_history)

    async def send_message_stream(self, chat, message: str):
        """Send a message and yield streaming response chunks."""
        import asyncio
        import queue
        import threading

        # Use a queue to communicate between threads
        chunk_queue = queue.Queue()
        exception_holder = []

        def stream_in_thread():
            """Run the blocking Gemini stream in a separate thread."""
            try:
                response = chat.send_message(message, stream=True)
                for chunk in response:
                    if chunk.text:
                        chunk_queue.put(chunk.text)
            except Exception as e:
                exception_holder.append(e)
            finally:
                chunk_queue.put(None)  # Signal completion

        # Start the streaming thread
        thread = threading.Thread(target=stream_in_thread)
        thread.start()

        # Yield chunks as they arrive
        while True:
            # Check for chunks without blocking the event loop
            try:
                chunk = await asyncio.get_event_loop().run_in_executor(
                    None, chunk_queue.get, True, 0.1
                )
                if chunk is None:  # Completion signal
                    break
                yield chunk
            except queue.Empty:
                continue

            # Check for exceptions
            if exception_holder:
                raise exception_holder[0]

        thread.join()

    def send_message(self, chat, message: str) -> str:
        """Send a message and return the full response."""
        response = chat.send_message(message)
        return response.text


# Global singleton instance
_gemini_service: GeminiService | None = None


def get_gemini_service() -> GeminiService:
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
