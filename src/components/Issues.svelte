<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import type { Issue } from "$lib/http-client";
  import type { Repo } from "$lib/http-client/lib/repo";
  import { httpdApi } from "$lib/httpdApi";
  import { cn, timeAgo } from "$lib/utils";

  import { onMount } from "svelte";

  import Icon from "./Icon.svelte";

  let { repo }: { repo: Repo } = $props();

  let issueFilter: "open" | "closed" = $state("open");
  let openIssues: Issue[] = $state([]);
  let closedIssues: Issue[] = $state([]);
  let openPage = $state(0);
  let closedPage = $state(0);
  let currentIssues = $derived(
    issueFilter === "open" ? openIssues : closedIssues,
  );

  async function loadMore(rid: string, filter: "open" | "closed") {
    if (filter === "open") {
      openIssues = [
        ...openIssues,
        ...(await httpdApi.getAllIssues(rid, {
          page: openPage,
          perPage: 10,
          status: "open",
        })),
      ];
      openPage++;
    } else {
      closedIssues = [
        ...closedIssues,
        ...(await httpdApi.getAllIssues(rid, {
          page: closedPage,
          perPage: 10,
          status: "closed",
        })),
      ];
      closedPage++;
    }
  }

  async function setFilter(newFilter: "open" | "closed") {
    if (newFilter === issueFilter) return;

    issueFilter = newFilter;

    const url = new URL(page.url);
    url.searchParams.set("status", newFilter);
    await goto(url, { replaceState: true, noScroll: true, keepFocus: true });

    const issuesArray = newFilter === "open" ? openIssues : closedIssues;
    if (issuesArray.length === 0) {
      await loadMore(repo.rid, newFilter);
    }
  }

  onMount(async () => {
    issueFilter =
      page.url.searchParams.get("status") === "closed" ? "closed" : "open";
    await loadMore(repo.rid, issueFilter);
  });

  $effect(() => {
    const status = page.url.searchParams.get("status");
    if (
      status &&
      (status === "open" || status === "closed") &&
      status !== issueFilter
    ) {
      issueFilter = status;
      const issuesArray = status === "open" ? openIssues : closedIssues;
      if (issuesArray.length === 0) {
        loadMore(repo.rid, status);
      }
    }
  });
</script>

<Card variant="outline">
  <div class="flex flex-col gap-2">
    <div class="text-2xl font-bold">Issues</div>

    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        onclick={() => setFilter("open")}
        class={cn(issueFilter === "open" && "bg-accent")}>
        <div class="text-success-foreground">
          <Icon name="issue" />
        </div>
        <span class="flex items-center gap-4">
          Open <span class="text-muted-foreground">
            {repo.payloads["xyz.radicle.project"].meta.issues.open}
          </span>
        </span>
      </Button>
      <Button
        variant="outline"
        onclick={() => setFilter("closed")}
        class={cn(issueFilter === "closed" && "bg-accent")}>
        <div class="text-merged">
          <Icon name="issue-closed" />
        </div>
        <span class="flex items-center gap-4">
          Closed <span class="text-muted-foreground">
            {repo.payloads["xyz.radicle.project"].meta.issues.closed}
          </span>
        </span>
      </Button>
    </div>

    {#if currentIssues.length === 0}
      <div class="text-muted-foreground">No issues found</div>
    {/if}
    {#each currentIssues as issue}
      <Card
        variant="navigable"
        class="flex flex-col gap-2"
        onclick={() => {
          goto(`issues/${issue.id}?rid=${repo.rid}`);
        }}>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            {#if issue.state.status === "open"}
              <div class="text-success-foreground">
                <Icon name="issue" />
              </div>
            {:else}
              <div class="text-merged">
                <Icon name="issue-closed" />
              </div>
            {/if}
            {issue.title}
          </div>
          <div class="flex items-center gap-2">
            {#if issue.discussion.length > 1}
              {issue.discussion.length - 1}
              <Icon name="comment" />
            {/if}
          </div>
        </div>
        <div class="text-sm text-muted-foreground">
          Opened by <span class="font-bold">{issue.author.alias}</span>
          –
          {timeAgo(new Date(issue.discussion[0].timestamp * 1000))} ago
        </div>
      </Card>
    {/each}
    {#if currentIssues.length < (issueFilter === "open" ? repo.payloads["xyz.radicle.project"].meta.issues.open : repo.payloads["xyz.radicle.project"].meta.issues.closed)}
      <Button variant="outline" onclick={() => loadMore(repo.rid, issueFilter)}>
        Load more
      </Button>
    {/if}
  </div>
</Card>
