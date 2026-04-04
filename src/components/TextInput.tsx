interface TextInputProps {
  text: string;
  onChange: (text: string) => void;
}

export function TextInput({ text, onChange }: TextInputProps) {
  return (
    <div className="space-y-2 p-4">
      <textarea value={text} onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text to synthesize..." rows={4}
        className="w-full px-3 py-2 border rounded-md text-sm resize-y focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}
