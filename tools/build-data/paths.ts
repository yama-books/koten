import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_VERSION = 1;
export const GENERATOR_VERSION = '1.0.0';
export const paths = {
  root,
  sources: {
    poems: path.join(root, '百人一首_本文・作者_一次データ.md'),
    historical: path.join(root, '百人一首_読み_歴史的仮名遣い.md'),
    modern: path.join(root, '百人一首_読み_現代仮名遣い.md'),
    variants: path.join(root, '百人一首_読み_異同確認.md'),
    textCorrections: path.join(root, '百人一首_本文校正一覧_PDF原本表記_許容解答.md'),
  },
  generated: path.join(root, 'packages', 'hyakunin', 'src', 'data', 'generated'),
  review: path.join(root, 'review'),
  reviewFile: (directory: string, name: string) => path.join(directory, `${name}.yaml`),
};
