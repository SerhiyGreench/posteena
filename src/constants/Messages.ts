import { Translations } from '@/constants/Translations';
import {
    type GenerateConstantsType,
    generateConstants,
} from '@/utils/generateConstants.ts';

type TranslationType = typeof Translations.en;

export const Messages = generateConstants(
    Translations.en,
) as GenerateConstantsType<TranslationType>;

export type MessagesType = typeof Messages;
