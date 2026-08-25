import { render } from 'svelte/server';

import SearchDialog from '../SearchDialog.svelte';

export const renderSearchDialog = (): string => render(SearchDialog).body;
