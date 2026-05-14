/**
 * Web Speech API wrapper for Voice Search
 */

export const startVoiceSearch = (onResult: (text: string) => void, onEnd: () => void, onError: (err: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        onError("Brauzeringiz ovozli qidiruvni qo'llab-quvvatlamaydi.");
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ'; // Supporting Uzbek
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        onError("Ovozni aniqlashda xatolik yuz berdi: " + event.error);
        onEnd();
    };

    recognition.onend = () => {
        onEnd();
    };

    recognition.start();
    return recognition;
};
