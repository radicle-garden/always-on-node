<script lang="ts">
  import { page } from "$app/state";
  import ErrorContainer from "$components/ErrorContainer.svelte";
</script>

<ErrorContainer status={page.status} primaryButtonText="Back home" />
