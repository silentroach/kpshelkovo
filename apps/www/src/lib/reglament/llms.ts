import { md } from '@shelkovo/markdown';

import { compareLlmsPath } from '@/compare/lib/public-surface';
import { llmsSection, markdownLinkItem, serializeLlmsDocument } from '@/lib/markdown/llms-document';

import { absoluteUrl } from '../site';
import {
  reglamentApiCatalogUrl,
  reglamentEstimateDetails2026DataUrl,
  reglamentEstimateDetailsMarkdownUrl,
  reglamentEstimate2026DataUrl,
  reglamentFull2026DataUrl,
  reglamentFullMarkdownUrl,
  reglamentMarkdownUrl,
  reglamentUrl
} from './routes';

export const build = (): string =>
  serializeLlmsDocument({
    title: 'Регламент и смета Шелково',
    summary:
      'Обоснование тарифа по смете 2026: услуги, имущество, ресурсы и расчет с подтверждающими документами.',
    introduction: [
      md.paragraph(
        'Смета описывает расчет затрат. Ее итог сам по себе не подтверждает сумму к оплате собственником. Для чтения и проверки выбирайте Markdown, для пересчета — JSON, для изменения параметров — калькулятор в браузере.'
      )
    ],
    sections: [
      llmsSection('Разобраться в расчете', [
        md.list([
          markdownLinkItem(
            'Смета в Markdown',
            absoluteUrl(reglamentMarkdownUrl()),
            'официальные и пересчитанные итоги, формулы, строки и источники. Здесь объяснены различия итогов и ограничения расчета.'
          ),
          markdownLinkItem(
            'Полный регламент',
            absoluteUrl(reglamentFullMarkdownUrl()),
            'индекс имущества, услуг, периодичности, сопоставлений со сметой и проверок; подробности в тематических Markdown-файлах.'
          ),
          markdownLinkItem(
            'Детальная смета',
            absoluteUrl(reglamentEstimateDetailsMarkdownUrl()),
            'индекс работ, материалов, машин, труда и контрольных итогов со ссылками на документы.'
          ),
          markdownLinkItem(
            'Калькулятор в браузере',
            absoluteUrl(reglamentUrl()),
            'интерактивный пересчет при изменении параметров.'
          ),
          markdownLinkItem(
            'Сравнение тарифов поселков',
            absoluteUrl(compareLlmsPath()),
            'исходные поселковые платежи и их нормализация; у этих чисел другое назначение, чем у расчетных затрат сметы.'
          )
        ])
      ]),
      llmsSection('Обработать данные и проверить связи', [
        md.list([
          markdownLinkItem(
            'JSON агрегированной сметы',
            absoluteUrl(reglamentEstimate2026DataUrl()),
            [
              md.text('все разделы и строки; '),
              md.inlineCode('official'),
              md.text(' хранит итоги из документа, '),
              md.inlineCode('computed'),
              md.text(' — пересчет движком, '),
              md.inlineCode('formulas'),
              md.text(' и '),
              md.inlineCode('caveats'),
              md.text(' объясняют расчет.')
            ]
          ),
          markdownLinkItem(
            'JSON полного регламента',
            absoluteUrl(reglamentFull2026DataUrl()),
            'имущество, услуги, сопоставления со строками сметы и расчетные допущения.'
          ),
          markdownLinkItem(
            'JSON детальной сметы',
            absoluteUrl(reglamentEstimateDetails2026DataUrl()),
            [
              md.text(
                'работы и ресурсы, источники, контрольные итоги и вопросы для проверки. Связи со строками и услугами объяснены в '
              ),
              md.link(
                absoluteUrl(reglamentEstimateDetailsMarkdownUrl()),
                'индексе детальной сметы'
              ),
              md.text('.')
            ]
          ),
          markdownLinkItem(
            'Каталог API регламента',
            absoluteUrl(reglamentApiCatalogUrl()),
            'контракты лент, схемы и OpenAPI.'
          ),
          markdownLinkItem(
            'Как выбрать источник на сайте',
            absoluteUrl('/.well-known/agent-skills/site-sections/SKILL.md'),
            'когда обращаться к смете, сравнению, документам и другим разделам.'
          )
        ])
      ])
    ]
  });
