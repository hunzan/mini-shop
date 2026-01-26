// src/components/A11y/SkipToContent.tsx
type Props = {
  targetId?: string;
  label?: string;
};

export default function SkipToContent({
  targetId = "main",
  label = "跳到主要內容",
}: Props) {
  return (
    <a href={`#${targetId}`} className="skip-link">
      {label}
    </a>
  );
}
