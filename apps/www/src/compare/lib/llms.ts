import { count } from '@shelkovo/format';

import { compareRuText } from '@shelkovo/format';
import {
  llmsSection,
  markdownList,
  serializeLlmsDocument,
} from '@/lib/markdown/llms-document';

import { loadAllData } from './data';
import { canon } from './site';
import type { Settlement } from './settlement/types';

function abs(path: string): string {
  return canon(path);
}

function refs(
  list: readonly Pick<Settlement, 'shortName' | 'slug'>[],
): string[] {
  return list.map(
    (item) => `${item.shortName}: ${abs(`/settlements/${item.slug}/`)}`,
  );
}

export async function build(kind: 'short' | 'full'): Promise<string> {
  const { settlements, baseline, stats, ratings } = await loadAllData();
  const top = settlements
    .filter((item) => item.slug !== baseline.slug)
    .sort((a, b) => {
      const d =
        (ratings.get(b.slug)?.score ?? 0) - (ratings.get(a.slug)?.score ?? 0);
      if (d !== 0) return d;
      return compareRuText(a.shortName, b.shortName);
    })
    .slice(0, 2);
  const list = [baseline, ...top];
  const home = abs('/');
  const rating = abs('/rating/');
  const feed = abs('/data/settlements.json');
  const explorer = abs('/data/explorer.json');
  const short = abs('/llms.txt');
  const full = abs('/llms-full.txt');
  const skills = abs('/.well-known/agent-skills/index.json');

  return kind === 'short'
    ? serializeLlmsDocument({
        title: 'Сравнение тарифов поселков',
        file: 'llms.txt',
        sections: [
          llmsSection('Описание', [
            markdownList([
              'Раздел `/815/compare/` сравнивает тарифы на содержание коттеджных поселков с тарифом КП Шелково.',
              'В данных есть тарифы, базовая инфраструктура, общественные пространства, сервисная модель и условный рейтинг качества среды.',
              `Сейчас в базе ${count(stats.totalSettlements, ['поселок', 'поселка', 'поселков'])}.`,
            ]),
          ]),
          llmsSection('Главные URL', [
            markdownList([
              `Главная: ${home}`,
              `Методика рейтинга: ${rating}`,
              `Основная JSON-лента: ${feed}`,
              `Облегченная лента explorer: ${explorer}`,
              `Индекс инструкций для автоматического чтения: ${skills}`,
              `Расширенная версия этого текста: ${full}`,
              'Примеры детальных страниц:',
              ...refs(list),
            ]),
          ]),
          llmsSection('Что открывать первым', [
            markdownList([
              'Для анализа всех поселков используйте `data/settlements.json`.',
              '`data/explorer.json` нужен только для облегченного списка, карты и минимального набора данных.',
              'Список `sources` остается на детальных страницах и не входит в общую ленту.',
              'Если нужен первоисточник или человекочитаемый контекст, переходите на `/settlements/[slug]/`.',
            ]),
          ]),
          llmsSection('Ограничения данных', [
            markdownList([
              'Если факт не подтвержден источником, поле может быть опущено.',
              'Отсутствие поля означает «неизвестно», а не «точно нет».',
              'Тариф не входит в формулу условного рейтинга.',
            ]),
          ]),
        ],
      })
    : serializeLlmsDocument({
        title: 'Сравнение тарифов поселков',
        file: 'llms-full.txt',
        sections: [
          llmsSection('Проект', [
            markdownList([
              'Это публичный раздел для сравнения тарифов на содержание коттеджных поселков с тарифом КП Шелково.',
              'Раздел помогает сопоставить цену и подтвержденные признаки среды: инженерную инфраструктуру, общественные пространства, сервисную модель и условный рейтинг.',
              `Сейчас в базе ${count(stats.totalSettlements, ['поселок', 'поселка', 'поселков'])}.`,
            ]),
          ]),
          llmsSection('Канонические URL', [
            markdownList([
              `Главная: ${home}`,
              `Короткий обзор llms.txt: ${short}`,
              `Подробный обзор llms-full.txt: ${full}`,
              `Методика рейтинга: ${rating}`,
              `Основная JSON-лента: ${feed}`,
              `Облегченная лента explorer: ${explorer}`,
              `Индекс инструкций для автоматического чтения: ${skills}`,
              'Примеры детальных страниц поселков:',
              ...refs(list),
            ]),
          ]),
          llmsSection('Описание data/settlements.json', [
            markdownList([
              'Это основная структурированная лента для массового анализа поселков.',
              'Структура `settlements[]` включает подтвержденные поля карточки поселка: `name`, `short_name`, `slug`, `website`, `telegram`, `management_company`, полный `location`, полный `tariff`, необязательный блок `lots`, `water_in_tariff`, `rabstvo`, `infrastructure`, `common_spaces`, `service_model`, вычисленное поле `rating` и объект `distance` с `moscow_km`, `mkad_km`, `shelkovo_km`.',
              'Поле `rating` сериализуется как число `0..100` и служит техническим прокси качества среды для сортировки и сравнения.',
              'Объект `comparisons` индексируется по `slug` и содержит `tariffDelta`, `tariffDeltaPercent` и `isCheaper` относительно базового поселка Шелково.',
              'Объект `stats` содержит агрегированные показатели по тарифам, отдельную peer-медиану для рейтинговой группы Шелково и общее число поселков.',
              'Список первоисточников `sources` в общую ленту не включен; за ним нужно идти на детальную страницу поселка.',
            ]),
          ]),
          llmsSection('Описание data/explorer.json', [
            markdownList([
              'Это отдельная облегченная лента для главного списка и карты, а не основной источник для анализа.',
              'Его `settlements[]` включает только `name`, `shortName`, `slug`, `rating`, `isBaseline`, `location.lat`, `location.lng`, `location.district`, `tariff.normalizedPerSotkaMonth`, `tariff.normalizedIsEstimate`, а также необязательные `rabstvo` и сокращенный `managementCompany`.',
              'Используйте его только когда нужен минимальный набор данных для массовой первичной выборки или повторения логики главной страницы.',
            ]),
          ]),
          llmsSection('Детальные страницы поселков', [
            markdownList([
              'Страницы вида `/settlements/[slug]/` остаются каноническим человекочитаемым представлением по одному поселку.',
              'Они удобны, когда нужно дать ссылку на HTML или Markdown-страницу, а не только забрать структурированные данные.',
              'Если нужна максимально полная структурированная картина, сначала используйте `data/settlements.json`, а затем переходите на детальную страницу по `slug`.',
            ]),
          ]),
          llmsSection('Рейтинг', [
            markdownList([
              'Условный рейтинг считается на этапе сборки и не является интегральной ценой жизни или рыночной оценкой недвижимости.',
              'Тариф намеренно исключен из формулы.',
              'Базовые блоки рейтинга: инфраструктура, общественные пространства, сервисная модель и удаленность от Москвы.',
              'Если данных мало, карточка тянется к нейтральной середине шкалы, а не трактуется автоматически как слабая или сильная.',
              `Публичное объяснение методики: ${rating}`,
            ]),
          ]),
          llmsSection('Ограничения данных', [
            markdownList([
              'Если факт не подтвержден источником, поле может быть опущено.',
              'Отсутствие поля означает «неизвестно», а не «точно нет».',
              'Основной язык сайта русский; названия поселков, разделов и часть полей заданы по-русски.',
              '`data/explorer.json` оптимизирован для списка и карты и не заменяет полную ленту `data/settlements.json`.',
            ]),
          ]),
        ],
      });
}
