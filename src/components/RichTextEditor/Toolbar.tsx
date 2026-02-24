import { type ChangeEvent, type ReactElement, useState } from 'react';
import { type Editor } from '@tiptap/react';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    CheckSquare,
    Code,
    CodeXml,
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
    Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Input } from 'ui/input';
import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover';
import { SimpleTooltip } from '@/components/SimpleTooltip';
import MenuButton from './MenuButton';

export interface ToolbarProps {
    editor: Editor | null;
}

const Toolbar = ({ editor }: ToolbarProps): ReactElement | null => {
    const { t } = useTranslation();
    const [linkUrl, setLinkUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');

    if (!editor) {
        return null;
    }

    const setLink = (): void => {
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

    const addImage = (): void => {
        if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run();
            setImageUrl('');
        }
    };

    const addYoutubeVideo = (): void => {
        if (youtubeUrl) {
            editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
            setYoutubeUrl('');
        }
    };

    const onFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];

        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert(t('errorFileSize'));
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
        <div className="supports-backdrop-filter:bg-muted/40 bg-muted/50 sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b p-1 backdrop-blur-sm">
            <div className="mr-1 flex items-center gap-1 border-r pr-1">
                <MenuButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    tooltip={t('undo')}
                >
                    <Undo className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    tooltip={t('redo')}
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
                    tooltip={t('heading1')}
                >
                    <Heading1 className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    isActive={editor.isActive('heading', { level: 2 })}
                    tooltip={t('heading2')}
                >
                    <Heading2 className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    isActive={editor.isActive('heading', { level: 3 })}
                    tooltip={t('heading3')}
                >
                    <Heading3 className="size-4" />
                </MenuButton>
            </div>

            <div className="mr-1 flex items-center gap-1 border-r pr-1">
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    tooltip={t('bold')}
                >
                    <Bold className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    tooltip={t('italic')}
                >
                    <Italic className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                    }
                    isActive={editor.isActive('underline')}
                    tooltip={t('underline')}
                >
                    <UnderlineIcon className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    tooltip={t('strike')}
                >
                    <Strikethrough className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive('code')}
                    tooltip={t('code')}
                >
                    <Code className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleCodeBlock().run()
                    }
                    isActive={editor.isActive('codeBlock')}
                    tooltip={t('codeBlock')}
                >
                    <CodeXml className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleHighlight().run()
                    }
                    isActive={editor.isActive('highlight')}
                    tooltip={t('highlight')}
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
                    tooltip={t('alignLeft')}
                >
                    <AlignLeft className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign('center').run()
                    }
                    isActive={editor.isActive({ textAlign: 'center' })}
                    tooltip={t('alignCenter')}
                >
                    <AlignCenter className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign('right').run()
                    }
                    isActive={editor.isActive({ textAlign: 'right' })}
                    tooltip={t('alignRight')}
                >
                    <AlignRight className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign('justify').run()
                    }
                    isActive={editor.isActive({ textAlign: 'justify' })}
                    tooltip={t('alignJustify')}
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
                    tooltip={t('bulletList')}
                >
                    <List className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                    isActive={editor.isActive('orderedList')}
                    tooltip={t('orderedList')}
                >
                    <ListOrdered className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleTaskList().run()
                    }
                    isActive={editor.isActive('taskList')}
                    tooltip={t('taskList')}
                >
                    <CheckSquare className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                    }
                    isActive={editor.isActive('blockquote')}
                    tooltip={t('blockquote')}
                >
                    <Quote className="size-4" />
                </MenuButton>
                <MenuButton
                    onClick={() =>
                        editor.chain().focus().setHorizontalRule().run()
                    }
                    tooltip={t('horizontalRule')}
                >
                    <Minus className="size-4" />
                </MenuButton>
            </div>

            <div className="flex items-center gap-1">
                <Popover>
                    <SimpleTooltip content={t('insertLink')}>
                        <PopoverTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                        >
                            <LinkIcon className="size-4" />
                        </PopoverTrigger>
                    </SimpleTooltip>
                    <PopoverContent className="w-80">
                        <div className="flex gap-2">
                            <Input
                                placeholder={t('insertLink')}
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                            />
                            <Button size="sm" onClick={setLink}>
                                {t('set')}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Popover>
                    <SimpleTooltip content={t('insertImage')}>
                        <PopoverTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                        >
                            <ImageIcon className="size-4" />
                        </PopoverTrigger>
                    </SimpleTooltip>
                    <PopoverContent className="w-80">
                        <div className="flex gap-2">
                            <Input
                                placeholder={t('insertImage')}
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                            />
                            <Button size="sm" onClick={addImage}>
                                {t('add')}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Popover>
                    <SimpleTooltip content={t('insertYoutube')}>
                        <PopoverTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                        >
                            <Video className="size-4" />
                        </PopoverTrigger>
                    </SimpleTooltip>
                    <PopoverContent className="w-80">
                        <div className="flex gap-2">
                            <Input
                                placeholder={t('insertYoutube')}
                                value={youtubeUrl}
                                onChange={e => setYoutubeUrl(e.target.value)}
                            />
                            <Button size="sm" onClick={addYoutubeVideo}>
                                {t('add')}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <SimpleTooltip
                    content={`${t('uploadFile')} (${t('maxFileSize')})`}
                >
                    <label className="hover:bg-muted flex size-7 cursor-pointer items-center justify-center rounded-lg">
                        <FileUp className="size-4" />
                        <input
                            type="file"
                            className="hidden"
                            onChange={onFileChange}
                            accept="image/*,video/*,.pdf,.doc,.docx"
                        />
                        <span className="sr-only">{t('uploadFile')}</span>
                    </label>
                </SimpleTooltip>

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
                    tooltip={t('insertTable')}
                >
                    <TableIcon className="size-4" />
                </MenuButton>
            </div>
        </div>
    );
};

export default Toolbar;
