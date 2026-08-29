import { useState, useEffect } from 'react';

export function useTypewriter(
  phrases: string[],
  typingSpeed = 55,
  deletingSpeed = 30,
  delayBetween = 2000
) {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
      if (text.length > 0) {
        timeoutId = setTimeout(() => setText(text.slice(0, -1)), deletingSpeed);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    } else {
      if (text.length < currentPhrase.length) {
        timeoutId = setTimeout(() => setText(currentPhrase.slice(0, text.length + 1)), typingSpeed);
      } else {
        timeoutId = setTimeout(() => setIsDeleting(true), delayBetween);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [text, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, delayBetween]);

  return text;
}
