import { type ReactElement, useState } from 'react';
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
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    CheckSquare,
    Code,
    FileUp,
    Heading1,
    Heading2,
    Heading3,
    Highlighter,
    Image as ImageIcon,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Minus,
    Quote,
    Redo,
    Strikethrough,
    Table as TableIcon,
    Underline as UnderlineIcon,
    Undo,
    Youtube as YoutubeIcon,
} from 'lucide-react';
import { Button } from 'ui/Button';
import { Input } from 'ui/Input';
import { Popover, PopoverContent, PopoverTrigger } from 'ui/Popover';
import { Toggle } from 'ui/Toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/Tooltip';

const MenuButton = ({
    onClick,
    isActive = false,
    disabled = false,
    tooltip,
    children,
}: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    tooltip: string;
    children: React.ReactNode;
}) => (
    <Tooltip>
        <TooltipTrigger
            render={
                <Toggle
                    size="sm"
                    pressed={isActive}
                    onPressedChange={onClick}
                    disabled={disabled}
                    className="size-8 p-0"
                />
            }
        >
            {children}
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
);

const Toolbar = ({ editor }: { editor: Editor | null }) => {
    const [linkUrl, setLinkUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');

    if (!editor) {
        return null;
    }

    const setLink = () => {
        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: linkUrl })
            .run();
        setLinkUrl('');
    };

    const addImage = () => {
        if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run();
            setImageUrl('');
        }
    };

    const addYoutubeVideo = () => {
        if (youtubeUrl) {
            editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
            setYoutubeUrl('');
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('File size too large. Max 5MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = event => {
                const src = event.target?.result as string;
                if (file.type.startsWith('image/')) {
                    editor.chain().focus().setImage({ src }).run();
                } else {
                    // For other files, we could insert a link
                    editor
                        .chain()
                        .focus()
                        .insertContent(
                            `<a href="${src}" download="${file.name}">${file.name}</a>`,
                        )
                        .run();
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-muted/50 flex flex-wrap items-center gap-1 border-b p-1">
            <div className="mr-1 flex items-center gap-1 border-r pr-1">
                <MenuButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    tooltip="Undo"
                >
                    <Undo className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    tooltip="Redo"
                >
                    <Redo className="size-4" />
                </MenuButton>
            </div>

            <div className="mr-1 flex items-center gap-1 border-r pr-1">
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    isActive={editor.isActive('heading', { level: 1 })}
                    tooltip="Heading 1"
                >
                    <Heading1 className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    isActive={editor.isActive('heading', { level: 2 })}
                    tooltip="Heading 2"
                >
                    <Heading2 className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    isActive={editor.isActive('heading', { level: 3 })}
                    tooltip="Heading 3"
                >
                    <Heading3 className="size-4" />
                </MenuButton>
            </div>

            <div className="mr-1 flex items-center gap-1 border-r pr-1">
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    tooltip="Bold"
                >
                    <Bold className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    tooltip="Italic"
                >
                    <Italic className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                    }
                    isActive={editor.isActive('underline')}
                    tooltip="Underline"
                >
                    <UnderlineIcon className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    tooltip="Strike"
                >
                    <Strikethrough className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive('code')}
                    tooltip="Code"
                >
                    <Code className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleHighlight().run()
                    }
                    isActive={editor.isActive('highlight')}
                    tooltip="Highlight"
                >
                    <Highlighter className="size-4" />
                </MenuButton>
            </div>

            <div className="mr-1 flex items-center gap-1 border-r pr-1">
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign('left').run()
                    }
                    isActive={editor.isActive({ textAlign: 'left' })}
                    tooltip="Align Left"
                >
                    <AlignLeft className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign('center').run()
                    }
                    isActive={editor.isActive({ textAlign: 'center' })}
                    tooltip="Align Center"
                >
                    <AlignCenter className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign('right').run()
                    }
                    isActive={editor.isActive({ textAlign: 'right' })}
                    tooltip="Align Right"
                >
                    <AlignRight className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign('justify').run()
                    }
                    isActive={editor.isActive({ textAlign: 'justify' })}
                    tooltip="Align Justify"
                >
                    <AlignJustify className="size-4" />
                </MenuButton>
            </div>

            <div className="mr-1 flex items-center gap-1 border-r pr-1">
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                    isActive={editor.isActive('bulletList')}
                    tooltip="Bullet List"
                >
                    <List className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                    isActive={editor.isActive('orderedList')}
                    tooltip="Ordered List"
                >
                    <ListOrdered className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleTaskList().run()
                    }
                    isActive={editor.isActive('taskList')}
                    tooltip="Task List"
                >
                    <CheckSquare className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                    }
                    isActive={editor.isActive('blockquote')}
                    tooltip="Blockquote"
                >
                    <Quote className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setHorizontalRule().run()
                    }
                    tooltip="Horizontal Rule"
                >
                    <Minus className="size-4" />
                </MenuButton>
            </div>

            <div className="flex items-center gap-1">
                <Popover>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                        />
                                    }
                                />
                            }
                        >
                            <LinkIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Insert Link</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-80">
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://example.com"
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                            />
                            <Button size="sm" onClick={setLink}>
                                Set
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Popover>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                        />
                                    }
                                />
                            }
                        >
                            <ImageIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Insert Image URL</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-80">
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://example.com/image.jpg"
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                            />
                            <Button size="sm" onClick={addImage}>
                                Add
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Popover>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                        />
                                    }
                                />
                            }
                        >
                            <YoutubeIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Insert YouTube Video</TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-80">
                        <div className="flex gap-2">
                            <Input
                                placeholder="YouTube URL"
                                value={youtubeUrl}
                                onChange={e => setYoutubeUrl(e.target.value)}
                            />
                            <Button size="sm" onClick={addYoutubeVideo}>
                                Add
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Tooltip>
                    <TooltipTrigger
                        render={
                            <label className="hover:bg-muted flex size-7 cursor-pointer items-center justify-center rounded-lg">
                                <FileUp className="size-4" />
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={onFileChange}
                                    accept="image/*,video/*,.pdf,.doc,.docx"
                                />
                            </label>
                        }
                    >
                        Upload File
                    </TooltipTrigger>
                    <TooltipContent>Upload File (Max 5MB)</TooltipContent>
                </Tooltip>

                <MenuButton
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .insertTable({
                                rows: 3,
                                cols: 3,
                                withHeaderRow: true,
                            })
                            .run()
                    }
                    tooltip="Insert Table"
                >
                    <TableIcon className="size-4" />
                </MenuButton>
            </div>
        </div>
    );
};

const RichTextEditor = (): ReactElement => {
    const editor = useEditor({
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
                placeholder: 'Write something amazing...',
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
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
            },
        },
    });

    return (
        <div className="focus-within:ring-ring flex flex-col overflow-hidden rounded-md border shadow-sm focus-within:ring-1">
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;
