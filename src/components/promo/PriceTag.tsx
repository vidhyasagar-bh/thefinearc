import { formatPrice } from '../../utils/format';

interface Props {
  price: number;
  original?: number;
  onSale?: boolean;
  percentOff?: number;
  from?: boolean;
  size?: 'sm' | 'lg';
}

// A price, or a sale price with the old one struck through
export function PriceTag({ price, original, onSale, percentOff = 0, from, size = 'sm' }: Props) {
  const prefix = from ? 'From ' : '';
  if (!onSale || original === undefined) return <>{prefix}{formatPrice(price)}</>;
  return (
    <span className="inline-flex items-baseline flex-wrap gap-x-2">
      <span>{prefix}{formatPrice(price)}</span>
      <s className={`text-art-muted font-normal ${size === 'lg' ? 'text-base' : 'text-xs'}`}>{formatPrice(original)}</s>
      <span className="font-sans text-[9px] tracking-widest uppercase bg-red-50 text-red-600 px-1.5 py-0.5 self-center no-underline">
        {percentOff > 0 ? `${percentOff}% off` : 'Sale'}
      </span>
    </span>
  );
}
