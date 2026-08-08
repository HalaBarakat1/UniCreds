"use client";

import { useEffect, useMemo, useState } from "react";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import type { HeroPhrase } from "@/types/portal";

const WORD_DELAY_MS = 80;
const PAUSE_DURATION_MS = 3000;
const TRANSITION_DURATION_MS = 500;
const NEXT_PHRASE_BUFFER_MS = 300;

interface AnimatedHeroProps {
  phrases: HeroPhrase[];
}

function BrandMark() {
  return (
    <SealCheck
      weight="fill"
      className="inline-block align-middle text-brand-accent animate-subtle-beat ms-2"
      size="1.1em"
    />
  );
}

export default function AnimatedHero({ phrases }: AnimatedHeroProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setPhraseIndex(0);
    setVisible(false);
  }, [phrases]);

  const currentPhrase = phrases[phraseIndex] ?? phrases[0];

  const tokens = useMemo(() => currentPhrase.text.split(" "), [currentPhrase]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [phraseIndex, phrases]);

  useEffect(() => {
    const totalWords = tokens.length;
    const totalAnimationTime = totalWords * WORD_DELAY_MS + TRANSITION_DURATION_MS;

    let timer: ReturnType<typeof setTimeout>;

    if (visible) {
      timer = setTimeout(() => {
        setVisible(false);
      }, totalAnimationTime + PAUSE_DURATION_MS);
    } else {
      timer = setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, totalAnimationTime + NEXT_PHRASE_BUFFER_MS);
    }

    return () => clearTimeout(timer);
  }, [visible, tokens.length, phrases.length]);

  return (
    <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight font-medium text-gray-800 tracking-wide">
      {tokens.map((token, index) => {
        const totalWords = tokens.length;
        const reverseIndex = totalWords - 1 - index;
        const delay = (visible ? index : reverseIndex) * WORD_DELAY_MS;
        const isLastWord = index === totalWords - 1;

        return (
          <span
            key={`${phraseIndex}-${index}`}
            className={`word ${visible ? "in" : "out"}`}
            style={{ transitionDelay: `${delay}ms` }}
          >
            {token}
            {isLastWord && currentPhrase.hasIcon && <BrandMark />}
          </span>
        );
      })}
    </h1>
  );
}
