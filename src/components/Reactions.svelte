<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip";
  import type { Comment } from "$lib/http-client";

  let { comment }: { comment: Comment } = $props();
</script>

{#if comment?.reactions?.length > 0}
  <div class="flex flex-row gap-2">
    {#each comment.reactions as reaction}
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <div
              class="flex flex-row gap-2 rounded-md border px-2 py-1 text-sm text-gray-500">
              <span class="text-gray-500">{reaction.emoji}</span>
              <span class="text-gray-500">{reaction.authors.length}</span>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <div class="text-sm text-gray-500">
              {#each reaction.authors.slice(0, 3) as author}
                {author.alias}
              {/each}
              {#if reaction.authors.length > 3}
                and {reaction.authors.length - 3} more
              {/if}
            </div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    {/each}
  </div>
{/if}
