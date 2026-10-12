"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

interface EmojiPickerProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const emojiGroups = {
  Smileys: [
    ["😀", "grinning face"], ["😃", "smiling face"], ["😄", "smiling eyes"], ["😁", "beaming"],
    ["😆", "laughing"], ["😅", "sweat smile"], ["😂", "joy"], ["🙂", "slight smile"],
    ["😉", "wink"], ["😊", "blush"], ["🥰", "love"], ["😍", "heart eyes"],
    ["🤩", "star struck"], ["😘", "kiss"], ["😋", "yummy"], ["😎", "cool"],
    ["🤔", "thinking"], ["🫡", "salute"], ["🥹", "touched"], ["😴", "sleepy"],
    ["😭", "crying"], ["😮", "surprised"], ["😬", "grimace"], ["🤗", "hug"],
  ],
  People: [
    ["👋", "wave"], ["🤚", "raised hand"], ["🖐️", "hand"], ["✋", "stop"],
    ["👏", "clap"], ["🙌", "celebrate"], ["🫶", "heart hands"], ["🤝", "handshake"],
    ["👍", "thumbs up"], ["👎", "thumbs down"], ["✌️", "peace"], ["🤞", "fingers crossed"],
    ["🙏", "thanks please"], ["💪", "strong"], ["🫂", "hugging"], ["👀", "eyes"],
  ],
  Nature: [
    ["🌱", "seedling"], ["🌿", "herb leaf"], ["🍀", "four leaf clover"], ["🌸", "cherry blossom"],
    ["🌻", "sunflower"], ["🌙", "moon"], ["⭐", "star"], ["✨", "sparkles"],
    ["☀️", "sun"], ["🌈", "rainbow"], ["☁️", "cloud"], ["🔥", "fire"],
    ["🌊", "wave"], ["🪴", "potted plant"], ["🦋", "butterfly"], ["🐈", "cat"],
  ],
  Food: [
    ["🍓", "strawberry"], ["🍒", "cherries"], ["🍑", "peach"], ["🥑", "avocado"],
    ["🍕", "pizza"], ["🍜", "noodles"], ["🍣", "sushi"], ["🍰", "cake"],
    ["🍪", "cookie"], ["☕", "coffee"], ["🧋", "bubble tea"], ["🥂", "cheers"],
  ],
  Symbols: [
    ["💜", "purple heart"], ["💙", "blue heart"], ["💚", "green heart"], ["🩷", "pink heart"],
    ["❤️", "red heart"], ["🧡", "orange heart"], ["💛", "yellow heart"], ["🤍", "white heart"],
    ["💯", "hundred"], ["✅", "check"], ["❣️", "heart exclamation"], ["💫", "dizzy"],
  ],
} as const;

type EmojiCategory = keyof typeof emojiGroups;
const categories = Object.keys(emojiGroups) as EmojiCategory[];

export default function EmojiPicker({ open, onToggle, onClose, onSelect }: EmojiPickerProps) {
  const [category, setCategory] = useState<EmojiCategory>("Smileys");
  const [query, setQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized) return categories.flatMap((group) => emojiGroups[group]
      .filter(([, label]) => label.includes(normalized) || group.toLowerCase().includes(normalized))
      .map(([emoji, label]) => ({ emoji, label })));
    return emojiGroups[category].map(([emoji, label]) => ({ emoji, label }));
  }, [category, query]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open, onClose]);

  return (
    <div className="emoji-picker-wrap" ref={pickerRef}>
      <button ref={triggerRef} className={`composer-tool emoji-trigger${open ? " is-selected" : ""}`} type="button" onClick={onToggle} aria-label="Open emoji picker" aria-expanded={open} aria-haspopup="dialog" title="Emoji picker">
        <Icon name="smile" size={19} />
      </button>
      {open && <div className="emoji-picker" role="dialog" aria-label="Emoji picker">
        <div className="emoji-picker-heading"><div><strong>Emoji</strong><span>Choose a little expression</span></div><button className="emoji-close" type="button" onClick={() => { onClose(); triggerRef.current?.focus(); }} aria-label="Close emoji picker"><Icon name="x" size={16} /></button></div>
        <label className="emoji-search"><Icon name="search" size={16} /><span className="sr-only">Search emojis</span><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} placeholder="Search emoji" /></label>
        <div className="emoji-categories" role="group" aria-label="Emoji categories">{categories.map((item) => <button key={item} type="button" className={category === item && !query ? "is-active" : ""} onClick={() => { setCategory(item); setQuery(""); }} aria-pressed={category === item && !query}>{item}</button>)}</div>
        <p className="emoji-category-title">{query ? "SEARCH RESULTS" : category.toUpperCase()}</p>
        {filtered.length ? <div className="emoji-grid" role="group" aria-label={query ? "Search results" : category}>{filtered.map(({ emoji, label }) => <button key={`${emoji}-${label}`} type="button" onClick={() => { onSelect(emoji); setQuery(""); }} aria-label={`Insert ${label}`} title={label}>{emoji}</button>)}</div> : <p className="emoji-no-results">No emojis found. Try another search.</p>}
      </div>}
    </div>
  );
}
