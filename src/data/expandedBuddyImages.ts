import type { ImageSourcePropType } from 'react-native';
import type { Mood } from '../types';

/** Species-specific illustrations; other catalogue entries retain their existing silhouette. */
export const EXPANDED_BUDDY_IMAGES: Partial<Record<string, Record<Mood, ImageSourcePropType>>> = {
  'philodendron-heartleaf': {
    happy: require('../../assets/buddies/philodendron-heartleaf-happy.png'),
    thirsty: require('../../assets/buddies/philodendron-heartleaf-thirsty.png'),
    snoozing: require('../../assets/buddies/philodendron-heartleaf-snoozing.png'),
  },
  'philodendron-brasil': {
    happy: require('../../assets/buddies/philodendron-brasil-happy.png'),
    thirsty: require('../../assets/buddies/philodendron-brasil-thirsty.png'),
    snoozing: require('../../assets/buddies/philodendron-brasil-snoozing.png'),
  },
  'alocasia-polly': {
    happy: require('../../assets/buddies/alocasia-polly-happy.png'),
    thirsty: require('../../assets/buddies/alocasia-polly-thirsty.png'),
    snoozing: require('../../assets/buddies/alocasia-polly-snoozing.png'),
  },
  'anthurium': {
    happy: require('../../assets/buddies/anthurium-happy.png'),
    thirsty: require('../../assets/buddies/anthurium-thirsty.png'),
    snoozing: require('../../assets/buddies/anthurium-snoozing.png'),
  },
  'phalaenopsis': {
    happy: require('../../assets/buddies/phalaenopsis-happy.png'),
    thirsty: require('../../assets/buddies/phalaenopsis-thirsty.png'),
    snoozing: require('../../assets/buddies/phalaenopsis-snoozing.png'),
  },
  'boston-fern': {
    happy: require('../../assets/buddies/boston-fern-happy.png'),
    thirsty: require('../../assets/buddies/boston-fern-thirsty.png'),
    snoozing: require('../../assets/buddies/boston-fern-snoozing.png'),
  },
  'pilea': {
    happy: require('../../assets/buddies/pilea-happy.png'),
    thirsty: require('../../assets/buddies/pilea-thirsty.png'),
    snoozing: require('../../assets/buddies/pilea-snoozing.png'),
  },
  'begonia-maculata': {
    happy: require('../../assets/buddies/begonia-maculata-happy.png'),
    thirsty: require('../../assets/buddies/begonia-maculata-thirsty.png'),
    snoozing: require('../../assets/buddies/begonia-maculata-snoozing.png'),
  },
  'jade': {
    happy: require('../../assets/buddies/jade-happy.png'),
    thirsty: require('../../assets/buddies/jade-thirsty.png'),
    snoozing: require('../../assets/buddies/jade-snoozing.png'),
  },
  'echeveria': {
    happy: require('../../assets/buddies/echeveria-happy.png'),
    thirsty: require('../../assets/buddies/echeveria-thirsty.png'),
    snoozing: require('../../assets/buddies/echeveria-snoozing.png'),
  },
  'christmas-cactus': {
    happy: require('../../assets/buddies/christmas-cactus-happy.png'),
    thirsty: require('../../assets/buddies/christmas-cactus-thirsty.png'),
    snoozing: require('../../assets/buddies/christmas-cactus-snoozing.png'),
  },
  'dracaena-marginata': {
    happy: require('../../assets/buddies/dracaena-marginata-happy.png'),
    thirsty: require('../../assets/buddies/dracaena-marginata-thirsty.png'),
    snoozing: require('../../assets/buddies/dracaena-marginata-snoozing.png'),
  },
  'croton': {
    happy: require('../../assets/buddies/croton-happy.png'),
    thirsty: require('../../assets/buddies/croton-thirsty.png'),
    snoozing: require('../../assets/buddies/croton-snoozing.png'),
  },
  'african-violet': {
    happy: require('../../assets/buddies/african-violet-happy.png'),
    thirsty: require('../../assets/buddies/african-violet-thirsty.png'),
    snoozing: require('../../assets/buddies/african-violet-snoozing.png'),
  },
  'aglaonema': {
    happy: require('../../assets/buddies/aglaonema-happy.png'),
    thirsty: require('../../assets/buddies/aglaonema-thirsty.png'),
    snoozing: require('../../assets/buddies/aglaonema-snoozing.png'),
  },
  'parlor-palm': {
    happy: require('../../assets/buddies/parlor-palm-happy.png'),
    thirsty: require('../../assets/buddies/parlor-palm-thirsty.png'),
    snoozing: require('../../assets/buddies/parlor-palm-snoozing.png'),
  },
  'english-ivy': {
    happy: require('../../assets/buddies/english-ivy-happy.png'),
    thirsty: require('../../assets/buddies/english-ivy-thirsty.png'),
    snoozing: require('../../assets/buddies/english-ivy-snoozing.png'),
  },
  'tradescantia': {
    happy: require('../../assets/buddies/tradescantia-happy.png'),
    thirsty: require('../../assets/buddies/tradescantia-thirsty.png'),
    snoozing: require('../../assets/buddies/tradescantia-snoozing.png'),
  },
  'maranta': {
    happy: require('../../assets/buddies/maranta-happy.png'),
    thirsty: require('../../assets/buddies/maranta-thirsty.png'),
    snoozing: require('../../assets/buddies/maranta-snoozing.png'),
  },
  'syngonium': {
    happy: require('../../assets/buddies/syngonium-happy.png'),
    thirsty: require('../../assets/buddies/syngonium-thirsty.png'),
    snoozing: require('../../assets/buddies/syngonium-snoozing.png'),
  },
  'lettuce': {
    happy: require('../../assets/buddies/lettuce-happy.png'),
    thirsty: require('../../assets/buddies/lettuce-thirsty.png'),
    snoozing: require('../../assets/buddies/lettuce-snoozing.png'),
  },
  'kale': {
    happy: require('../../assets/buddies/kale-happy.png'),
    thirsty: require('../../assets/buddies/kale-thirsty.png'),
    snoozing: require('../../assets/buddies/kale-snoozing.png'),
  },
  'bush-bean': {
    happy: require('../../assets/buddies/bush-bean-happy.png'),
    thirsty: require('../../assets/buddies/bush-bean-thirsty.png'),
    snoozing: require('../../assets/buddies/bush-bean-snoozing.png'),
  },
  'pea': {
    happy: require('../../assets/buddies/pea-happy.png'),
    thirsty: require('../../assets/buddies/pea-thirsty.png'),
    snoozing: require('../../assets/buddies/pea-snoozing.png'),
  },
  'cucumber': {
    happy: require('../../assets/buddies/cucumber-happy.png'),
    thirsty: require('../../assets/buddies/cucumber-thirsty.png'),
    snoozing: require('../../assets/buddies/cucumber-snoozing.png'),
  },
  'zucchini': {
    happy: require('../../assets/buddies/zucchini-happy.png'),
    thirsty: require('../../assets/buddies/zucchini-thirsty.png'),
    snoozing: require('../../assets/buddies/zucchini-snoozing.png'),
  },
  'strawberry': {
    happy: require('../../assets/buddies/strawberry-happy.png'),
    thirsty: require('../../assets/buddies/strawberry-thirsty.png'),
    snoozing: require('../../assets/buddies/strawberry-snoozing.png'),
  },
  'blueberry': {
    happy: require('../../assets/buddies/blueberry-happy.png'),
    thirsty: require('../../assets/buddies/blueberry-thirsty.png'),
    snoozing: require('../../assets/buddies/blueberry-snoozing.png'),
  },
  'rosemary': {
    happy: require('../../assets/buddies/rosemary-happy.png'),
    thirsty: require('../../assets/buddies/rosemary-thirsty.png'),
    snoozing: require('../../assets/buddies/rosemary-snoozing.png'),
  },
  'parsley': {
    happy: require('../../assets/buddies/parsley-happy.png'),
    thirsty: require('../../assets/buddies/parsley-thirsty.png'),
    snoozing: require('../../assets/buddies/parsley-snoozing.png'),
  },
  'cilantro': {
    happy: require('../../assets/buddies/cilantro-happy.png'),
    thirsty: require('../../assets/buddies/cilantro-thirsty.png'),
    snoozing: require('../../assets/buddies/cilantro-snoozing.png'),
  },
  'chives': {
    happy: require('../../assets/buddies/chives-happy.png'),
    thirsty: require('../../assets/buddies/chives-thirsty.png'),
    snoozing: require('../../assets/buddies/chives-snoozing.png'),
  },
  'garlic': {
    happy: require('../../assets/buddies/garlic-happy.png'),
    thirsty: require('../../assets/buddies/garlic-thirsty.png'),
    snoozing: require('../../assets/buddies/garlic-snoozing.png'),
  },
  'radish': {
    happy: require('../../assets/buddies/radish-happy.png'),
    thirsty: require('../../assets/buddies/radish-thirsty.png'),
    snoozing: require('../../assets/buddies/radish-snoozing.png'),
  },
  'carrot': {
    happy: require('../../assets/buddies/carrot-happy.png'),
    thirsty: require('../../assets/buddies/carrot-thirsty.png'),
    snoozing: require('../../assets/buddies/carrot-snoozing.png'),
  },
  'meyer-lemon': {
    happy: require('../../assets/buddies/meyer-lemon-happy.png'),
    thirsty: require('../../assets/buddies/meyer-lemon-thirsty.png'),
    snoozing: require('../../assets/buddies/meyer-lemon-snoozing.png'),
  },
};
