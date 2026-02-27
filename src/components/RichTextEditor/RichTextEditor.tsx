import { type ReactElement, useEffect, useRef } from 'react';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslation } from 'react-i18next';
import { cn } from 'ui/lib/utils';
import Toolbar from './Toolbar';

interface RichTextEditorProps {
    content?: string;
    onUpdate?: (content: string) => void;
    editable?: boolean;
}

const RichTextEditor = ({
    content = '',
    onUpdate,
    editable = true,
}: RichTextEditorProps): ReactElement => {
    const { t } = useTranslation();
    const onUpdateRef = useRef(onUpdate);

    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    const editor = useEditor(
        {
            editable,
            extensions: [
                StarterKit,
                Underline,
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                Highlight,
                TextStyle,
                Color,
                FontFamily,
                Link.configure({
                    openOnClick: false,
                }),
                Image,
                Youtube.configure({
                    width: 480,
                    height: 320,
                }),
                Placeholder.configure({
                    placeholder: t('notes.placeholder'),
                }),
                TaskList,
                TaskItem.configure({
                    nested: true,
                }),
                Table.configure({
                    resizable: true,
                }),
                TableRow,
                TableHeader,
                TableCell,
            ],
            content,
            onUpdate: ({ editor }) => {
                onUpdateRef.current?.(editor.getHTML());
            },
            editorProps: {
                attributes: {
                    class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
                },
            },
            immediatelyRender: false,
        },
        [],
    );

    useEffect(() => {
        if (!editor) {
            return;
        }
        editor.setEditable(editable);
    }, [editable, editor]);

    useEffect(() => {
        if (!editor || content === editor.getHTML()) {
            return;
        }

        // Avoid content jumps while the user is typing
        if (editor.isFocused && editable) {
            return;
        }

        editor.commands.setContent(content, { emitUpdate: false });
    }, [content, editor, editable]);

    return (
        <div
            className={cn(
                'focus-within:ring-ring flex flex-col overflow-hidden',
                editable
                    ? 'rounded-md border shadow-sm transition-all duration-200 focus-within:ring-1'
                    : 'bg-transparent',
            )}
        >
            {editable && (
                <div className="w-full">
                    <Toolbar editor={editor} />
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;
