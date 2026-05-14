/**
 * Web Speech Synthesis wrapper
 */

export const speak = (text: string, lang: string = 'uz-UZ') => {
    if (!window.speechSynthesis) {
        console.warn("Speech synthesis not supported");
        return;
    }

    // Stop any current speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find an Uzbek voice
    let selectedVoice = voices.find(voice => voice.lang.startsWith('uz') || voice.name.toLowerCase().includes('uzbek'));
    
    // If no Uzbek voice, try Turkish (tr) as it's phonetically closer than English/Russian
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('tr'));
    }

    if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
    } else {
        utterance.lang = lang;
    }

    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
};
