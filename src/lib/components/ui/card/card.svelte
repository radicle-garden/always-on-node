<script module>
	import type { HTMLAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	import { cn, type WithElementRef } from '$lib/utils.js';

	export const cardVariants = tv({
		base: 'flex flex-col gap-6 rounded-md border p-2 shadow-sm',
		variants: {
			variant: {
				default: 'bg-card text-card-foreground',
				outline: 'border bg-transparent',
				navigable:
					'bg-card text-card-foreground cursor-pointer hover:brightness-110'
			}
		}
	});

	export type CardVariant = VariantProps<typeof cardVariants>['variant'];

	export type CardProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: CardVariant;
	};
</script>

<script lang="ts">
	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = 'default',
		...restProps
	}: CardProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(cardVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
