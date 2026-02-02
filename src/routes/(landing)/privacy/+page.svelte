<script lang="ts">
</script>

{#snippet section(title: string, paragraphs: string[])}
  <div class="flex flex-col gap-6">
    <div class="txt-heading-xxl">{title}</div>
    {#each paragraphs as paragraph, index (index)}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <div class="txt-body-m-regular">{@html paragraph}</div>
    {/each}
  </div>
{/snippet}

<div class="mb-16 w-full">
  <div class="txt-heading-xxxl">Privacy Policy</div>
  <div class="txt-heading-xxl text-text-quarternary">
    Last updated: 13 June 2025
  </div>
</div>
<div class="flex w-full flex-col gap-12">
  {@render section("1. General information", [
    `Monadic Works GmbH, Gneisenaustrasse 48, 10961 Berlin, Germany (hereinafter “<strong>Monadic GmbH</strong>”, “<strong>we</strong>” or “<strong>us</strong>”) takes the protection of personal data very seriously.`,
    `We treat personal data confidentially and always in accordance with the applicable data protection laws, in particular Regulation (EU) 2016/679 (hereinafter “General Data Protection Regulation” or “<strong>GDPR”</strong>), the German Federal Data Protection Act (hereinafter “<strong>BDSG</strong>”), and in accordance with the provisions of this privacy policy.`,
    `The aim of this privacy policy is to inform you (hereinafter “<strong>data subject</strong>” or “<strong>you</strong>”) in accordance with Art. 12 et seq. GDPR about how we process your personal data and for what purposes we process your personal data when using our website radicle.garden (hereinafter “<strong>Website</strong>” and together with “<strong>Websites</strong>”) or contacting us.`,
    `Unless otherwise stated in this privacy policy, the terms used here have the meaning as defined in the GDPR.`,
  ])}
  {@render section("2. Data Controller", [
    `Monadic GmbH acts as a controller within the meaning of the GDPR in relation to your personal data processed in connection with the use of our Websites or a contact made to or by Monadic GmbH.`,
    `If you have any questions about this privacy policy or the processing of your personal data, you can contact us at the following contact details:`,
    `Monadic GmbH<br/>Gneisenaustrasse 48 <br/>10961 Berlin, Germany<br/>E-mail: company@monadic.xyz`,
  ])}
  {@render section(
    "3. Categories, purposes and legal bases of the personal data processed",
    [
      "We process different categories of your personal data for different purposes. Below you can see which data we process in which contexts, for which purposes and on which legal basis we base the respective processing.",
    ],
  )}
  <!-- The rest -->
</div>
