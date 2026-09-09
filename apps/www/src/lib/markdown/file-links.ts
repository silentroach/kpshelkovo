import { fileLinkIconMarkup } from '@shelkovo/ui/file-icons';

const HTML_LINK = /<a href="([^"]+)"([^>]*)>/gu;

export const renderFileLinks = (html: string): string =>
  html.replace(HTML_LINK, (link, href: string, attributes: string) => {
    const icon = fileLinkIconMarkup(href);

    return icon ? `<a href="${href}"${attributes} class="ui-file-link">${icon}` : link;
  });
