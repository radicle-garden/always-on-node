<script lang="ts">
  let { src, alt, fallbackSrc, class: className } = $props();

  let imgSrc = $state(src ?? fallbackSrc);

  $effect(() => {
    if (src) {
      imgSrc = src;
    } else {
      imgSrc = fallbackSrc;
    }
  });
</script>

<img
  src={imgSrc}
  {alt}
  class={className}
  onerror={() => (imgSrc = fallbackSrc)} />
