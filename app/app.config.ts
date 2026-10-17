// Light theme: thick ink outlines, solid pastel fills, large bold text, near-square corners.
// Colours live in assets/css/main.css. Class strings stay literal so Tailwind can find them.
const alleFarben: ('primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral')[] = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']
const gefuellt: ('solid' | 'soft' | 'subtle')[] = ['solid', 'soft', 'subtle']

export default defineAppConfig({
  ui: {
    button: {
      slots: {
        base: 'rounded-sm border-2 border-ink font-bold text-ink not-disabled:hover:brightness-95 not-disabled:active:translate-y-px disabled:opacity-40 aria-disabled:opacity-40',
      },
      variants: {
        size: {
          md: { base: 'px-3 py-2 text-base gap-2', leadingIcon: 'size-5', trailingIcon: 'size-5' },
          lg: { base: 'px-4 py-2.5 text-base gap-2', leadingIcon: 'size-5', trailingIcon: 'size-5' },
          xl: { base: 'px-4 py-3 text-lg gap-2.5', leadingIcon: 'size-6', trailingIcon: 'size-6' },
        },
      },
      compoundVariants: [
        { color: 'primary', variant: gefuellt, class: 'ring-0 text-ink bg-tl-blue-fill hover:bg-tl-blue-fill active:bg-tl-blue-fill disabled:bg-tl-blue-fill aria-disabled:bg-tl-blue-fill' },
        { color: 'secondary', variant: gefuellt, class: 'ring-0 text-ink bg-tl-violet-fill hover:bg-tl-violet-fill active:bg-tl-violet-fill disabled:bg-tl-violet-fill aria-disabled:bg-tl-violet-fill' },
        { color: 'success', variant: gefuellt, class: 'ring-0 text-ink bg-tl-green-fill hover:bg-tl-green-fill active:bg-tl-green-fill disabled:bg-tl-green-fill aria-disabled:bg-tl-green-fill' },
        { color: 'info', variant: gefuellt, class: 'ring-0 text-ink bg-tl-light-blue-fill hover:bg-tl-light-blue-fill active:bg-tl-light-blue-fill disabled:bg-tl-light-blue-fill aria-disabled:bg-tl-light-blue-fill' },
        { color: 'warning', variant: gefuellt, class: 'ring-0 text-ink bg-tl-orange-fill hover:bg-tl-orange-fill active:bg-tl-orange-fill disabled:bg-tl-orange-fill aria-disabled:bg-tl-orange-fill' },
        { color: 'error', variant: gefuellt, class: 'ring-0 text-ink bg-tl-red-fill hover:bg-tl-red-fill active:bg-tl-red-fill disabled:bg-tl-red-fill aria-disabled:bg-tl-red-fill' },
        { color: 'neutral', variant: gefuellt, class: 'ring-0 text-ink bg-ink-fill hover:bg-ink-fill active:bg-ink-fill disabled:bg-ink-fill aria-disabled:bg-ink-fill' },
        { color: alleFarben, variant: 'outline', class: 'ring-0 bg-white text-ink hover:bg-white active:bg-white' },
        { color: alleFarben, variant: 'ghost', class: 'border-transparent text-ink hover:bg-tl-grey-fill active:bg-tl-grey-fill' },
        { color: 'error', variant: ['outline', 'ghost'], class: 'text-tl-red' },
      ],
      defaultVariants: { size: 'lg' },
    },
    input: {
      slots: { base: 'rounded-sm font-medium' },
      variants: {
        variant: { outline: 'text-ink bg-white ring-2 ring-inset ring-ink focus-visible:ring-[3px]' },
        size: {
          lg: { base: 'px-3 py-2.5 text-base gap-2' },
          xl: { base: 'px-3.5 py-3 text-lg gap-2' },
        },
      },
      compoundVariants: [
        { color: 'error', highlight: true, class: 'ring-[3px] ring-tl-red bg-tl-red-fill' },
      ],
      defaultVariants: { size: 'lg' },
    },
    textarea: {
      slots: { base: 'rounded-sm font-medium' },
      variants: {
        variant: { outline: 'text-ink bg-white ring-2 ring-inset ring-ink focus-visible:ring-[3px]' },
        size: { lg: { base: 'px-3 py-2.5 text-base gap-2' } },
      },
      defaultVariants: { size: 'lg' },
    },
    select: {
      slots: {
        base: 'rounded-sm font-medium',
        content: 'rounded-sm ring-2 ring-ink shadow-lg',
        item: 'font-medium text-ink',
      },
      variants: {
        variant: { outline: 'text-ink bg-white ring-2 ring-inset ring-ink focus-visible:ring-[3px]' },
        size: {
          lg: { base: 'px-3 py-2.5 text-base gap-2', item: 'p-2.5 text-base gap-2' },
          xl: { base: 'px-3.5 py-3 text-lg gap-2', item: 'p-3 text-lg gap-2' },
        },
      },
      defaultVariants: { size: 'lg' },
    },
    checkbox: {
      slots: {
        base: 'rounded-[2px] ring-2 ring-inset ring-ink',
        label: 'font-semibold text-ink',
      },
      variants: {
        color: { primary: { indicator: 'bg-ink' } },
        size: { xl: { base: 'size-6', icon: 'size-5', container: 'h-7', wrapper: 'text-lg' } },
      },
      defaultVariants: { size: 'xl' },
    },
    formField: {
      slots: {
        label: 'font-bold text-ink',
        error: 'font-semibold',
      },
      defaultVariants: { size: 'xl' },
    },
    card: {
      slots: {
        root: 'rounded-md',
        header: 'px-4 py-3 sm:px-6 text-xl',
      },
      variants: {
        variant: { outline: { root: 'bg-white ring-0 border-[3px] border-ink divide-y-[3px] divide-ink' } },
      },
    },
    alert: {
      slots: {
        root: 'rounded-md border-[3px] border-ink text-ink',
        title: 'text-base font-bold',
        description: 'text-base opacity-100',
        icon: 'size-6',
      },
      compoundVariants: [
        { color: 'primary', variant: ['soft', 'subtle'], class: { root: 'ring-0 text-ink bg-tl-blue-fill' } },
        { color: 'success', variant: ['soft', 'subtle'], class: { root: 'ring-0 text-ink bg-tl-green-fill' } },
        { color: 'info', variant: ['soft', 'subtle'], class: { root: 'ring-0 text-ink bg-tl-light-blue-fill' } },
        { color: 'warning', variant: ['soft', 'subtle'], class: { root: 'ring-0 text-ink bg-tl-orange-fill' } },
        { color: 'error', variant: ['soft', 'subtle'], class: { root: 'ring-0 text-ink bg-tl-red-fill' } },
      ],
    },
    badge: {
      slots: { base: 'rounded-md border-2 border-ink font-bold' },
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'text-ink bg-tl-blue-fill' },
        { color: 'success', variant: 'solid', class: 'text-ink bg-tl-green-fill' },
        { color: 'warning', variant: 'solid', class: 'text-ink bg-tl-orange-fill' },
        { color: 'error', variant: 'solid', class: 'text-ink bg-tl-red-fill' },
        { color: 'neutral', variant: 'solid', class: 'text-ink bg-ink-fill' },
      ],
    },
    modal: {
      slots: {
        content: 'bg-white divide-y-[3px] divide-ink',
        title: 'text-xl font-bold text-ink',
        description: 'text-base text-muted',
      },
      variants: {
        fullscreen: { false: { content: 'rounded-md ring-0 border-[3px] border-ink' } },
      },
    },
    toast: {
      slots: {
        root: 'rounded-md ring-0 border-[3px] border-ink bg-white',
        title: 'text-base font-bold text-ink',
        description: 'text-base text-muted',
      },
    },
  },
})
