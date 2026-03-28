import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	MarkdownPostProcessorContext,
	Plugin,
	TFile,
} from 'obsidian';
// @ts-ignore
import * as chrono from 'chrono-node';
import { createDynamicDateViewPlugin } from './live-preview';
import { DynamicDatesSettings, DEFAULT_SETTINGS, DynamicDatesSettingTab } from './settings';

// We need to use moment which is globally available in Obsidian
declare global {
	interface Window {
		moment: any;
	}
}

/**
 * Returns a relative day suffix like "(in 3 days)" or "(5 days ago)".
 * Returns empty string for today.
 */
export function formatRelativeDaySuffix(todayDiff: number): string {
	const absDiff = Math.abs(todayDiff);
	if (todayDiff === 0) return '';
	if (todayDiff === 1) return '(in 1 day)';
	if (todayDiff === -1) return '(1 day ago)';
	if (todayDiff > 0) return `(in ${absDiff} days)`;
	return `(${absDiff} days ago)`;
}

export default class DynamicDatesPlugin extends Plugin {
	settings: DynamicDatesSettings;

	async onload() {
		console.log('Loading Dynamic Dates plugin');

		await this.loadSettings();

		// 1. Suggestor for Typing
		this.registerEditorSuggest(new DateSuggest(this));

		// 1.5. Live Preview Renderer
		this.registerEditorExtension([createDynamicDateViewPlugin(this)]);

		// 2. Reading Mode Renderer
		this.registerMarkdownPostProcessor((element: HTMLElement, context: MarkdownPostProcessorContext) => {
			const paragraphs = element.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th');
			paragraphs.forEach((p) => {
				this.replaceDatesInElement(p as HTMLElement);
			});
			// Also check the element itself if it's a text container
			this.replaceDatesInElement(element);
		});

		// Add Settings tab
		this.addSettingTab(new DynamicDatesSettingTab(this.app, this));
	}

	onunload() {
		console.log('Unloading Dynamic Dates plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Create a styled date bubble span from a date string.
	 */
	private createDateBubble(dateStr: string): HTMLSpanElement {
		const targetDate = window.moment(dateStr, this.settings.dateFormat);
		const relativeStr = targetDate.calendar(null, {
			sameDay: '[Today]',
			nextDay: '[Tomorrow]',
			nextWeek: 'dddd',
			lastDay: '[Yesterday]',
			lastWeek: '[Last] dddd',
			sameElse: 'MMM Do YYYY'
		});

		const todayDiff = targetDate.clone().startOf('day').diff(window.moment().startOf('day'), 'days');

		let bgColor = this.settings.currentDateBgColor;
		let textColor = this.settings.currentDateTextColor;

		if (todayDiff < 0) {
			bgColor = this.settings.pastDateBgColor;
			textColor = this.settings.pastDateTextColor;
		} else if (todayDiff > 0) {
			bgColor = this.settings.futureDateBgColor;
			textColor = this.settings.futureDateTextColor;
		}

		const daySuffix = formatRelativeDaySuffix(todayDiff);
		const displayText = daySuffix ? `${relativeStr} ${daySuffix}` : relativeStr;

		const span = document.createElement('span');
		span.addClass('dynamic-date-bubble');
		span.setText(displayText);
		span.title = `Absolute Date: ${dateStr}`;

		span.style.backgroundColor = bgColor;
		span.style.color = textColor;
		span.style.padding = '0px 6px';
		span.style.borderRadius = '4px';
		span.style.cursor = 'pointer';

		span.onclick = (e) => {
			e.preventDefault();
			this.app.workspace.openLinkText(dateStr, '', e.ctrlKey || e.metaKey);
		};

		return span;
	}

	replaceDatesInElement(element: HTMLElement) {
		// --- Strategy 1: Handle DOM-rendered internal links ---
		// Obsidian converts [[date]] into <a class="internal-link"> before
		// the post-processor runs, so we look for text "@" followed by an <a>.
		const links = Array.from(element.querySelectorAll('a.internal-link'));
		for (const link of links) {
			const prevNode = link.previousSibling;
			if (!prevNode || prevNode.nodeType !== Node.TEXT_NODE) continue;

			const textContent = prevNode.nodeValue || '';
			if (!textContent.endsWith('@')) continue;

			// Extract date from the link
			const dateStr = (link as HTMLAnchorElement).getAttribute('data-href') || link.textContent || '';
			if (!dateStr) continue;

			// Strip the trailing '@' from the text node
			prevNode.nodeValue = textContent.slice(0, -1);

			// Replace the <a> with a styled bubble
			const bubble = this.createDateBubble(dateStr);
			link.parentNode?.replaceChild(bubble, link);
		}

		// --- Strategy 2: Fallback for raw @[[...]] text (edge cases) ---
		const regex = /@\[\[(.*?)\]\]/g;
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
		const textNodes: Text[] = [];
		let node;
		while ((node = walker.nextNode())) {
			textNodes.push(node as Text);
		}

		for (const textNode of textNodes) {
			const text = textNode.nodeValue;
			if (!text || !regex.test(text)) continue;

			const fragment = document.createDocumentFragment();
			let lastIndex = 0;
			regex.lastIndex = 0;

			let match;
			while ((match = regex.exec(text)) !== null) {
				const beforeStr = text.substring(lastIndex, match.index);
				if (beforeStr) fragment.appendChild(document.createTextNode(beforeStr));

				const dateStr = match[1] as string;
				fragment.appendChild(this.createDateBubble(dateStr));
				lastIndex = regex.lastIndex;
			}

			const afterStr = text.substring(lastIndex);
			if (afterStr) fragment.appendChild(document.createTextNode(afterStr));

			textNode.parentNode?.replaceChild(fragment, textNode);
		}
	}
}

class DateSuggest extends EditorSuggest<string> {
	plugin: DynamicDatesPlugin;

	constructor(plugin: DynamicDatesPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const sub = line.substring(0, cursor.ch);

		// Trigger immediately after typing @
		const match = sub.match(/@([a-zA-Z0-9\s]*)$/);
		if (match) {
			return {
				start: { line: cursor.line, ch: match.index as number },
				end: cursor,
				query: match[1] || '',
			};
		}
		return null;
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		const query = context.query.toLowerCase().trim();
		let suggestions: string[] = [];

		const presets = [
			'today',
			'tomorrow',
			'next week',
			'next month',
			'next year'
		];

		if (query) {
			suggestions.push(...presets.filter(p => p.startsWith(query)));
		} else {
			suggestions.push(...presets);
		}

		// Parse the natural language query dynamically if it's not empty
		if (query.length > 0) {
			// @ts-ignore
			const results = chrono.parse(context.query);
			if (results && results.length > 0) {
				const parsedText = results[0]!.text.toLowerCase();
				if (!suggestions.includes(parsedText)) {
					suggestions.unshift(context.query); // Prioritize dynamic match
				}
			}
		}

		return [...new Set(suggestions)];
	}

	renderSuggestion(suggestion: string, el: HTMLElement): void {
		// @ts-ignore
		const results = chrono.parse(suggestion);
		let targetDate;
		if (results && results.length > 0) {
			// @ts-ignore
			targetDate = window.moment(results[0]!.start.date());
		} else {
			targetDate = window.moment();
		}

		const formattedTarget = targetDate.format(this.plugin.settings.dateFormat) as string;
		const relativeStr = targetDate.calendar(null, {
			sameDay: '[Today]',
			nextDay: '[Tomorrow]',
			nextWeek: 'dddd',
			lastDay: '[Yesterday]',
			lastWeek: '[Last] dddd',
			sameElse: 'MMM Do YYYY'
		}) as string;

		const todayDiff = targetDate.clone().startOf('day').diff(window.moment().startOf('day'), 'days');
		const daySuffix = formatRelativeDaySuffix(todayDiff);
		const displayText = daySuffix ? `${relativeStr} ${daySuffix}` : relativeStr;

		el.setText(`${displayText} (${formattedTarget})`);
	}

	selectSuggestion(suggestion: string, evt: MouseEvent | KeyboardEvent): void {
		if (this.context) {
			// @ts-ignore
			const results = chrono.parse(suggestion);
			if (results && results.length > 0) {
				// @ts-ignore
				const date = results[0]!.start.date();
				const formattedDateStr = window.moment(date).format(this.plugin.settings.dateFormat) as string;
				const formattedFinal = `@[[${formattedDateStr}]]`;
				this.context.editor.replaceRange(
					formattedFinal,
					this.context.start,
					this.context.end
				);
			}
		}
	}
}
