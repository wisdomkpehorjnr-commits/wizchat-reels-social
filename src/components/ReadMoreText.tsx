import { useState } from 'react';

interface ReadMoreTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

const ReadMoreText = ({ text, maxLength = 750, className = '' }: ReadMoreTextProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const needsTruncation = text.length > maxLength;

  if (!needsTruncation) {
    return <p className={`whitespace-pre-wrap ${className}`}>{text}</p>;
  }

  return (
    <div>
      <p className={`whitespace-pre-wrap ${className}`}>
        {expanded ? text : `${text.slice(0, maxLength)}...`}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-primary text-sm font-medium mt-1 hover:underline"
      >
        {expanded ? 'Hide' : 'Read more'}
      </button>
    </div>
  );
};

export default ReadMoreText;
