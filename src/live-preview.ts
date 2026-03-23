import { RangeSetBuilder } from '@codemirror/state';
import {
    Decoration,
    DecorationSet,
    EditorView,
    PluginValue,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from '@codemirror/view';
import DynamicDatesPlugin from './main';

export function createDynamicDateViewPlugin(plugin: DynamicDatesPlugin) {
    class DynamicDateWidget extends WidgetType {
        constructor(public relativeText: string, public absoluteDate: string, public bgColor: string, public textColor: string) {
            super();
        }

        toDOM(view: EditorView): HTMLElement {
            const span = document.createElement('span');
            span.addClass('dynamic-date-bubble');
            span.setText(this.relativeText);
            span.title = `Absolute Date: ${this.absoluteDate}`;

            span.style.backgroundColor = this.bgColor;
            span.style.color = this.textColor;
            span.style.padding = '0px 6px';
            span.style.borderRadius = '4px';
            span.style.cursor = 'pointer';

            span.onclick = (e) => {
                e.preventDefault();
                plugin.app.workspace.openLinkText(this.absoluteDate, '', e.ctrlKey || e.metaKey);
            };

            return span;
        }
    }

    function buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const regex = /@\[\[(.*?)\]\]/g;

        for (let { from, to } of view.visibleRanges) {
            // syntaxTree iterate logic helps to skip code blocks, but we can iterate text chunks to keep it simple.
            const text = view.state.sliceDoc(from, to);
            let match;
            while ((match = regex.exec(text)) !== null) {
                const start = from + match.index;
                const end = start + match[0].length;

                // We skip applying the widget if the cursor is exactly inside this text block.
                // This allows the user to click the text and edit `@[[2026-03-02]]` manually if they want.
                const selection = view.state.selection.main;
                const cursorInWidget = (selection.from >= start && selection.to <= end);

                if (!cursorInWidget) {
                    const dateStr = match[1] || '';
                    // @ts-ignore
                    const targetDate = window.moment(dateStr, plugin.settings.dateFormat);
                    const relativeStr = targetDate.calendar(null, {
                        sameDay: '[Today]',
                        nextDay: '[Tomorrow]',
                        nextWeek: 'dddd',
                        lastDay: '[Yesterday]',
                        lastWeek: '[Last] dddd',
                        sameElse: 'MMM Do YYYY'
                    }) as string;

                    const todayDiff = targetDate.clone().startOf('day').diff(window.moment().startOf('day'), 'days');

                    let widgetBgColor = plugin.settings.currentDateBgColor;
                    let widgetTextColor = plugin.settings.currentDateTextColor;

                    if (todayDiff < 0) {
                        widgetBgColor = plugin.settings.pastDateBgColor;
                        widgetTextColor = plugin.settings.pastDateTextColor;
                    } else if (todayDiff > 0) {
                        widgetBgColor = plugin.settings.futureDateBgColor;
                        widgetTextColor = plugin.settings.futureDateTextColor;
                    }

                    builder.add(
                        start,
                        end,
                        Decoration.replace({
                            widget: new DynamicDateWidget(relativeStr, dateStr, widgetBgColor, widgetTextColor),
                        })
                    );
                }
            }
        }
        return builder.finish();
    }

    return ViewPlugin.fromClass(
        class implements PluginValue {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = buildDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged || update.selectionSet) {
                    this.decorations = buildDecorations(update.view);
                }
            }

            destroy() { }
        },
        {
            decorations: (v) => v.decorations,
        }
    );
}
