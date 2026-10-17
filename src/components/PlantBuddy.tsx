import { Image } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { BUDDY_IMAGES } from '../data/buddyImages';
import { colors, potHex } from '../theme/tokens';
import { artFor } from '../data/species';
import type { ArtId, Mood, PotColor, SpeciesId } from '../types';
import type { FaceStyle } from '../store/plantStore';

/*
 * Plant buddies are the illustrated characters from the PlantFam asset set (assets/buddies),
 * one image per species and mood. The code-drawn version below (ported from
 * design/board/PlantArt.dc.html) is kept for the "faces off" setting, which needs plain plants.
 */

type Art = 'monstera' | 'pothos' | 'fig' | 'calathea' | 'snake' | 'hoya' | 'tomato' | 'pepper' | 'onion' | 'cutting';

/** Species without their own drawing yet borrow the closest silhouette. */
const ART_FOR: Record<ArtId, Art> = {
  monstera: 'monstera',
  pothos: 'pothos',
  fig: 'fig',
  calathea: 'calathea',
  snake: 'snake',
  hoya: 'hoya',
  'peace-lily': 'pothos',
  zz: 'fig',
  'string-of-pearls': 'pothos',
  'pink-princess': 'monstera',
  aloe: 'snake',
  spider: 'onion',
  rubber: 'fig',
  'bird-of-paradise': 'monstera',
  basil: 'calathea',
  mint: 'calathea',
  tomato: 'tomato',
  pepper: 'pepper',
  'bell-pepper': 'pepper',
  potato: 'tomato',
  'sweet-potato': 'pothos',
  okra: 'pepper',
  cucumber: 'pothos',
  zucchini: 'pothos',
  lettuce: 'calathea',
  kale: 'calathea',
  carrot: 'onion',
  garlic: 'onion',
  'spring-onion': 'onion',
};

const INK = colors.ink;
const G1 = colors.leaf;
const G2 = colors.leafDeep;
const G3 = colors.leafLight;
const S = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const MONSTERA = 'M0 0C-4 -2 -16 -6 -16 -17C-16 -26 -8 -31 0 -30C8 -31 16 -26 16 -17C16 -6 4 -2 0 0Z';
const MONSTERA_SLITS = 'M-16 -12L-6 -14M-16 -20L-6 -20M-12 -27L-5 -24M16 -12L6 -14M16 -20L6 -20M12 -27L5 -24';
const HEART = 'M0 0C-3 -3 -10 -6 -10 -12C-10 -17 -4 -18 0 -14C4 -18 10 -17 10 -12C10 -6 3 -3 0 0Z';
const VIOLIN = 'M0 0C-3 -1 -9 -4 -9 -11C-9 -16 -5 -17 -5 -21C-5 -25 -2 -28 0 -28C2 -28 5 -25 5 -21C5 -17 9 -16 9 -11C9 -4 3 -1 0 0Z';

function Plant({ art, bg }: { art: Art; bg: string }) {
  switch (art) {
    case 'monstera':
      return (
        <G {...S} strokeWidth={1.8}>
          <Path d="M50 68C47 58 38 52 28 48M50 68C53 57 62 50 72 45M50 68C49 54 50 42 52 31" fill="none" />
          {[
            ['translate(28 48) rotate(-62) scale(0.85)', G2],
            ['translate(72 45) rotate(60) scale(0.85)', G1],
            ['translate(52 31) rotate(4) scale(0.95)', G2],
          ].map(([t, fill]) => (
            <G key={t} transform={t}>
              <Path d={MONSTERA} fill={fill} />
              <Path d={MONSTERA_SLITS} stroke={bg} strokeWidth={2.4} />
            </G>
          ))}
        </G>
      );
    case 'pothos':
      return (
        <G {...S}>
          <Path d="M27 70C17 72 13 82 15 94M73 70C84 72 88 82 86 92" fill="none" />
          {[
            ['translate(17 80) rotate(-110) scale(0.8)', G1],
            ['translate(15 92) rotate(-80) scale(0.7)', G2],
            ['translate(84 80) rotate(110) scale(0.8)', G2],
            ['translate(86 91) rotate(82) scale(0.7)', G1],
            ['translate(34 66) rotate(-62) scale(1.05)', G1],
            ['translate(66 66) rotate(62) scale(1.05)', G2],
            ['translate(42 65) rotate(-26) scale(1.25)', G2],
            ['translate(58 65) rotate(26) scale(1.25)', G1],
            ['translate(50 63) scale(1.45)', G3],
          ].map(([t, fill]) => (
            <G key={t} transform={t}>
              <Path d={HEART} fill={fill} />
            </G>
          ))}
        </G>
      );
    case 'fig':
      return (
        <G {...S}>
          <Path d="M50 70C50 55 49 40 50 20" fill="none" strokeWidth={2.6} />
          {[
            ['translate(50 62) rotate(-62) scale(0.8)', G2],
            ['translate(50 58) rotate(58) scale(0.82)', G1],
            ['translate(50 47) rotate(-46) scale(0.9)', G1],
            ['translate(50 43) rotate(48) scale(0.9)', G2],
            ['translate(50 32) rotate(-28) scale(0.8)', G2],
            ['translate(50 28) rotate(32) scale(0.78)', G1],
            ['translate(50 21) scale(0.66)', G3],
          ].map(([t, fill]) => (
            <G key={t} transform={t}>
              <Path d={VIOLIN} fill={fill} />
            </G>
          ))}
        </G>
      );
    case 'calathea':
      return (
        <G {...S}>
          <Path d="M50 68L32 44M50 68L68 42M50 68L50 28M50 68L39 57M50 68L62 56" fill="none" />
          {[
            ['translate(31 42) rotate(-35)', G1, '#C9F7DC'],
            ['translate(69 40) rotate(35)', G2, '#A8F0C6'],
            ['translate(50 24) rotate(80)', G1, '#C9F7DC'],
          ].map(([t, fill, stripe]) => (
            <G key={t} transform={t}>
              <Ellipse rx={14} ry={11} fill={fill} />
              <Path d="M-8 -9Q-6 0 -8 9M0 -11Q2 0 0 11M8 -9Q10 0 8 9" stroke={stripe} strokeWidth={2} fill="none" />
            </G>
          ))}
          <G transform="translate(39 57) rotate(-15) scale(0.72)"><Ellipse rx={14} ry={11} fill={G3} /></G>
          <G transform="translate(62 56) rotate(15) scale(0.72)"><Ellipse rx={14} ry={11} fill={G3} /></G>
        </G>
      );
    case 'snake':
      return (
        <G>
          <G {...S}>
            <Path d="M40 70C33 56 28 40 26 22C34 38 40 54 45 70Z" fill={G2} />
            <Path d="M55 70C59 52 64 36 73 20C71 40 65 56 60 70Z" fill={G2} />
            <Path d="M45 70C41 52 40 30 45 6C50 30 52 52 53 70Z" fill={G1} />
            <Path d="M50 70C50 58 54 46 59 34C59 48 58 58 57 70Z" fill={G3} />
          </G>
          <Path d="M44 22l3 -0.5M43 34l5 -0.5M43 46l6 -0.5M31 38l3 0.5M34 50l3 0.5M67 34l-3 0.5M64 46l-3 0.5" stroke={colors.sun} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'hoya':
      return (
        <G {...S}>
          <Path d="M46 66C38 52 28 42 31 28C34 16 52 12 62 22M70 70C81 72 87 80 84 92" fill="none" />
          <Ellipse cx={40} cy={54} rx={7} ry={4.2} transform="rotate(-60 40 54)" fill={G2} />
          <Ellipse cx={31} cy={41} rx={7} ry={4.2} transform="rotate(-100 31 41)" fill={G1} />
          <Ellipse cx={33} cy={27} rx={6.5} ry={4} transform="rotate(-50 33 27)" fill={G2} />
          <Ellipse cx={46} cy={17} rx={6.5} ry={4} transform="rotate(10 46 17)" fill={G1} />
          <Ellipse cx={57} cy={60} rx={7} ry={4.2} transform="rotate(30 57 60)" fill={G1} />
          <Ellipse cx={80} cy={77} rx={6.5} ry={4} transform="rotate(60 80 77)" fill={G2} />
          <Ellipse cx={85} cy={88} rx={6} ry={3.8} transform="rotate(100 85 88)" fill={G1} />
          {[[63, 27], [58, 30.5], [68, 30.5], [60, 35.5], [66, 35.5]].map(([cx, cy]) => (
            <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={colors.bubblegum} />
          ))}
        </G>
      );
    case 'tomato':
      return (
        <G {...S}>
          <Path d="M70 66V10" fill="none" stroke="#B08455" strokeWidth={2.4} />
          <Path d="M50 66C50 50 48 34 51 14M50 52C42 46 34 44 26 46M50 40C58 34 64 30 70 30M51 26C44 22 38 20 32 22" fill="none" />
          <Path d="M26 46c-4-6 0-12 6-10 2-5 9-4 9 1 5 0 6 7 1 9-2 5-10 5-11 0-3 3-7 3-5 0z" fill={G1} />
          <Path d="M70 30c3-6 10-6 11-1 5 0 6 7 1 9-1 5-9 5-10 1-4 2-8-1-6-5z" fill={G2} />
          <Path d="M32 22c-3-6 2-11 7-9 2-5 9-3 8 2 4 1 4 7 0 8-2 4-9 4-10 0-3 2-7 0-5-1z" fill={G1} />
          <Circle cx={38} cy={56} r={7} fill={colors.coral} />
          <Circle cx={62} cy={48} r={6.5} fill={colors.coral} />
          <Circle cx={56} cy={60} r={5} fill="#FFB3A8" />
          <Circle cx={44} cy={34} r={5} fill={G3} />
        </G>
      );
    case 'pepper':
      return (
        <G {...S}>
          <Path d="M50 66C50 54 49 42 50 26M50 50C42 44 36 40 30 40M50 42C58 36 64 34 70 34" fill="none" />
          <Ellipse cx={30} cy={36} rx={10} ry={6} transform="rotate(-25 30 36)" fill={G2} />
          <Ellipse cx={70} cy={30} rx={10} ry={6} transform="rotate(25 70 30)" fill={G1} />
          <Ellipse cx={50} cy={20} rx={7} ry={11} fill={G1} />
          <Path d="M38 42c-7 5-10 16-6 24 4-5 10-13 10-23z" fill={colors.coral} />
          <Path d="M62 40c7 6 10 16 5 23-3-6-8-13-8-22z" fill={colors.orange} />
          <Path d="M53 46c2 7 1 13-4 17-2-6-1-12 1-17z" fill={colors.coral} />
        </G>
      );
    case 'onion':
      return (
        <G {...S}>
          <Path d="M38 66C36 46 30 28 24 12C30 22 36 34 42 66Z" fill={G2} />
          <Path d="M44 66C44 44 44 24 46 6C49 24 50 44 50 66Z" fill={G1} />
          <Path d="M52 66C54 46 58 28 66 10C64 28 60 46 57 66Z" fill={G2} />
          <Path d="M58 66C62 52 68 40 78 30C72 42 66 54 62 66Z" fill={G3} />
          <Path d="M33 66C32 54 28 44 20 36C26 42 32 52 37 66Z" fill={G3} />
        </G>
      );
    case 'cutting':
      return (
        <G {...S}>
          <Path d="M50 70C50 58 49 48 50 34" fill="none" />
          <G transform="translate(50 40) rotate(-48) scale(1.05)"><Path d={HEART} fill={G1} /></G>
          <G transform="translate(50 34) rotate(36) scale(1.15)"><Path d={HEART} fill={G2} /></G>
        </G>
      );
  }
}

function Pot({ color }: { color: string }) {
  return (
    <G>
      <Path d="M29 70h42l-4.5 23.5a4 4 0 0 1-3.9 3.2H37.4a4 4 0 0 1-3.9-3.2z" fill={color} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <Rect x={25} y={63} width={50} height={10} rx={5} fill={color} stroke={INK} strokeWidth={2} />
      <Path d="M34 77l1.4 11" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" />
    </G>
  );
}

function Jar() {
  return (
    <G>
      <Rect x={31} y={58} width={38} height={39} rx={9} fill="#D6EEFF" stroke={INK} strokeWidth={2} />
      <Path d="M33 70h34v18a7 7 0 0 1-7 7H40a7 7 0 0 1-7-7z" fill={colors.sky} opacity={0.55} />
      <Path d="M50 70C46 74 44 77 41 78M50 70C53 74 56 76 59 75M50 70C49 74 48 77 49 80" stroke="#FFFFFF" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Rect x={28} y={53} width={44} height={8} rx={4} fill="#A8D8FF" stroke={INK} strokeWidth={2} />
    </G>
  );
}

function Face({ mood, y, style }: { mood: Mood; y: number; style: FaceStyle }) {
  if (style === 'off') return null;
  // "Gentle" never shows the worried face.
  const m: Mood = style === 'gentle' && mood === 'thirsty' ? 'happy' : mood;
  const cheeks = (
    <>
      <Circle cx={39.5} cy={y + 4.5} r={2.4} fill="#FF7A9C" opacity={m === 'snoozing' ? 0.6 : 0.75} />
      <Circle cx={60.5} cy={y + 4.5} r={2.4} fill="#FF7A9C" opacity={m === 'snoozing' ? 0.6 : 0.75} />
    </>
  );
  if (m === 'snoozing') {
    return (
      <G>
        <Path d={`M41.5 ${y} q2.5 2.2 5 0 M53.5 ${y} q2.5 2.2 5 0`} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Circle cx={50} cy={y + 5.5} r={1.5} fill={INK} />
        {cheeks}
      </G>
    );
  }
  const eyes = (
    <>
      <Ellipse cx={44} cy={y} rx={1.9} ry={2.4} fill={INK} />
      <Ellipse cx={56} cy={y} rx={1.9} ry={2.4} fill={INK} />
    </>
  );
  if (m === 'thirsty') {
    return (
      <G>
        {eyes}
        <Path d={`M41.5 ${y - 3.5} L46 ${y - 5.5} M58.5 ${y - 3.5} L54 ${y - 5.5}`} stroke={INK} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <Path d={`M45.5 ${y + 7} Q47.75 ${y + 5} 50 ${y + 7} Q52.25 ${y + 9} 54.5 ${y + 7}`} stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Path d={`M64 ${y - 10} q-2.8 3.6 0 5.6 q2.8 -2 0 -5.6z`} fill={colors.sky} stroke={INK} strokeWidth={1.2} />
      </G>
    );
  }
  return (
    <G>
      {eyes}
      <Path d={`M46.5 ${y + 4.5} Q50 ${y + 8.5} 53.5 ${y + 4.5}`} stroke={INK} strokeWidth={1.9} fill="none" strokeLinecap="round" />
      {cheeks}
    </G>
  );
}

export interface PlantBuddyProps {
  /** Any catalogue id (or 'other-<group>', or 'cutting'); species without their own art show their closest look-alike. */
  speciesId: SpeciesId | 'cutting';
  mood?: Mood;
  pot?: PotColor;
  size?: number;
  /** Background behind the buddy; monstera fenestrations are drawn in this colour. */
  bg?: string;
  faces?: FaceStyle;
}

export function PlantBuddy({ speciesId, mood = 'happy', pot = 'yellow', size = 96, bg = colors.white, faces = 'full' }: PlantBuddyProps) {
  const artId = artFor(speciesId);
  if (faces !== 'off') {
    // "Gentle" never shows the worried face.
    const shown: Mood = faces === 'gentle' && mood === 'thirsty' ? 'happy' : mood;
    return (
      <Image
        source={BUDDY_IMAGES[artId][shown]}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }
  const art: Art = artId === 'cutting' ? 'cutting' : ART_FOR[artId];
  const jar = art === 'cutting';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Plant art={art} bg={bg} />
      {jar ? <Jar /> : <Pot color={potHex[pot]} />}
      <Face mood={mood} y={jar ? 79 : 81} style={faces} />
    </Svg>
  );
}
