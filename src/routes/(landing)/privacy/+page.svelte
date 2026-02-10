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
    Last updated: 10 February 2026
  </div>
</div>
<div class="flex w-full flex-col gap-12">
  {@render section("1. General information", [
    `Monadic Works GmbH, Gneisenaustrasse 48, 10961 Berlin, Germany (hereinafter “<strong>Monadic GmbH</strong>”, “<strong>we</strong>” or “<strong>us</strong>”) takes the protection of personal data very seriously.`,
    `We treat personal data confidentially and always in accordance with the applicable data protection laws, in particular Regulation (EU) 2016/679 (hereinafter “General Data Protection Regulation” or “<strong>GDPR</strong>”), the German Federal Data Protection Act (hereinafter “<strong>BDSG</strong>”), and in accordance with the provisions of this privacy policy.`,
    `The aim of this privacy policy is to inform you (hereinafter “<strong>data subject</strong>” or “<strong>you</strong>”) in accordance with Art. 12 et seq. GDPR about how we process your personal data and for what purposes we process your personal data when using our website radicle.garden (hereinafter “<strong>Website</strong>” and together with “<strong>Websites</strong>”) or contacting us.`,
    `Unless otherwise stated in this privacy policy, the terms used here have the meaning as defined in the GDPR.`,
  ])}
  {@render section("2. Data Controller", [
    `Monadic GmbH acts as a controller within the meaning of the GDPR in relation to your personal data processed in connection with the use of our Websites or a contact made to or by Monadic GmbH.`,
    `If you have any questions about this privacy policy or the processing of your personal data, you can contact us at the following contact details:`,
    `Monadic GmbH<br/>Gneisenaustrasse 48 <br/>10961 Berlin, Germany<br/>E-mail: company@monadic.works`,
  ])}
  {@render section(
    "3. Categories, purposes and legal bases of the personal data processed",
    [
      "We process different categories of your personal data for different purposes. Below you can see which data we process in which contexts, for which purposes and on which legal basis we base the respective processing.",
    ],
  )}
  {@render section("3.1 Visiting our Website", [
    "When visiting our Websites for informational purposes, i.e., mere viewing and without you providing us with any other information, certain personal data is automatically collected each time the Websites are called up and stored in so-called server log files. These are:",
    "<ul><li>Browser type and version. The specific type and model of Internet browser you are using, such as Google Chrome, Mozilla Firefox, or Microsoft Edge, along with the specific version of the browser.</li><li>Operating system used. Your operating system for your digital activity, such as Windows, macOS, Linux, iOS, or Android.</li><li>The date and time of access. The exact time of access to the Website.</li><li>IP address of the requesting computer. The unique numeric identifier assigned to a device when it connects to the Internet. </li></ul>",
    "Such data is not merged with other data sources, and the data is not evaluated for marketing purposes. ",
    "<span class='underline'>Legal basis:</span>",
    "The legal basis for the temporary storage and processing of such personal data is Art. 6 para. 1 sent. 1 lit. f GDPR. Our legitimate interest here is to be able to provide you with technically functional, attractive and user-friendly Websites as well as to ensure the security of our systems.",
    "<span class='underline'>Duration of the storage:</span>",
    "Such personal data will be deleted as soon as it is no longer required to achieve the purpose for which it was collected. For personal data stored in log files, this is the case after 7 days at the latest.",
    "However, in some cases, e.g., due to legal retention periods, we might be under the legal obligation to continue the storage of your personal data.",
  ])}
  {@render section("3.2 Use of our Services", [
    'We are processing certain personal data when you are using our services, i.e., the provision of the Radworks Product Server, storage space, the operation of portals, interfaces and additional services as well as related support services to the Customer ("<strong>Service</strong>").',
  ])}
  {@render section("a) User Account", [
    "When you register your user account, we process the following personal data:",
    "<ul><li>E-mail address</li><li>Password</li><li>IP Address</li><ul>",
    "<span class='underline'>Legal basis:</span>",
    "We process the aforementioned information to create your user account and, thus, such data will be processed for the performance of a contract or in order to take steps prior to entering into a contract in accordance with Art. 6 para. 1 sent. 1 lit. b GDPR. ",
    "<span class='underline'>Duration of the storage:</span>",
    "You can delete your user account at any time by sending an e-mail with your request to company@monadic.works. We will delete your user account when it has been inactive for 3 years. ",
    "However, in some cases, e.g., due to legal retention periods we might be under the legal obligation to continue the storage of your personal data.",
  ])}
  {@render section("b) Usage Data", [
    "When you use our Service, we process certain personal data about how you use it and the device you use to access it. We process the following usage data:",
    "<ul><li>Browser type and version. The specific type and model of Internet browser you are using, such as Google Chrome, Mozilla Firefox, or Microsoft Edge, along with the specific version of the browser.</li><li>Operating system used. Your operating system for your digital activity, such as Windows, macOS, Linux, iOS, or Android.</li><li>The date and time of access. The exact time of access to the Website.</li><li>IP address of the requesting computer. The unique numeric identifier assigned to a device when it connects to the Internet.</li></ul>",
    "The processing of this data is used for the technical provision of our Services and their contents, as well as to optimise their usability and ensure the security of our information technology systems.",
    "<span class='underline'>Legal basis:</span>",
    "The legal basis for the temporary storage and processing of such personal data is Art. 6 para. 1 sent. 1 lit. f GDPR. Our legitimate interest here is the technical provision of our Services and their contents, as well as to optimise their usability and ensure the security of our information technology systems.",
    "<span class='underline'>Duration of the storage:</span>",
    "Such personal data will be deleted as soon as it is no longer required to achieve the purpose for which it was collected. For personal data stored in log files, this is the case after 7 days at the latest.",
    "However, in some cases, e.g., due to legal retention periods we might be under the legal obligation to continue the storage of your personal data.",
  ])}
  {@render section("3.3 Contact", [
    'It is possible to contact us on our Website by e-mail. When you contact us, we collect and process certain information in connection with your specific request, such as, e.g., your name, e-mail address, and other data requested by us or data you voluntarily provide to us (hereinafter "<strong>Contact Data</strong>").',
    "<span class='underline'>Legal basis:</span>",
    "If you contact us as part of an existing contractual relationship or contact us in advance for information about our range of services, the Contact Data will be processed for the performance of a contract or in order to take steps prior to entering into a contract and to respond to your contact request in accordance with Art. 6 para. 1 sent. 1 lit. b GDPR. ",
    "Otherwise, the legal basis for the processing of Contact Data is Art. 6 para. 1 sent. 1 lit. f GDPR. The Contact Data is processed to pursue our legitimate interests in responding appropriately to customer/contact inquiries.",
    "<span class='underline'>Duration of the storage:</span>",
    "We will delete Contact Data as soon as the purpose for data storage and processing no longer applies (e.g., after your request has been processed). ",
    "However, in some cases, e.g., due to legal retention periods we might be under the legal obligation to continue the storage of your personal data.",
  ])}
  {@render section("3.4 Invoicing", [
    "We process your personal data for the purpose of issuing, sending, and managing invoices for our Services. These are:",
    "<ul><li>First and last name</li><li>Billing address</li><li>E-mail address</li><li>Company affiliation (if applicable)</li><li>Invoice number and amount</li><li>Payment status and date</li></ul>",
    "<span class='underline'>Legal basis:</span>",
    "Such personal data will be processed for the performance of a contract accordance with Art. 6 para. 1 sent. 1 lit. b GDPR.",
    "<span class='underline'>Duration of the storage:</span>",
    "Such personal data is stored in accordance with statutory retention periods for up to ten years.",
    "However, in some cases, e.g., due to legal retention periods, we might be under the legal obligation to continue the storage of your personal data.",
  ])}
  {@render section("3.5 Newsletter", [
    "With your consent, we may process your personal data to send you a newsletter via e-mail that contains information about our products and services. To send you the newsletter, we require processing your e-mail address and date and time of your registration.",
    'Our newsletters contain so-called tracking links that enable us to analyze the behavior of newsletter recipients. We may collect personal data such as regarding the opening of the newsletter (date and time), selected links, and the following information of the accessing computer system: IP address used, browser type and version, device type and operating system ("<strong>Tracking Data</strong>"). This enables us to statistically analyze the success or failure of online marketing campaigns.',
    "<span class='underline'>Legal basis:</span>",
    "The data processing activities with regard to the newsletter sending and newsletter tracking only take place if and insofar as you have expressly consented to it within the merits of Article 6 para. 1 sent. 1 lit. a GDPR. Your prior consent for such processing activities is obtained during the newsletter subscription process (double opt-in) by way of independent consent declaration referring to this privacy policy.",
    "You can revoke your consent at any time with effect for the future by clicking on the unsubscribe link in e-mails. The withdrawal of your consent does not affect the lawfulness of processing based on your consent before its withdrawal.",
    "<span class='underline'>Duration of storage:</span>",
    "We will delete your personal data as soon as the purpose for data storage and processing no longer applies. Your e-mail address will be stored for as long as the subscription to our newsletter is active.",
    "However, in some cases, e.g., due to legal retention periods, we might be under the legal obligation to continue the storage of your personal data.",
  ])}
  {@render section("4. Data Receiver", [
    "We might transfer your personal data to certain data receivers if such transfer is necessary to fulfill our contractual and legal obligations.",
    "In individual cases, we transfer personal data to our consultants in legal or tax matters, whereby these recipients act independently in their own data protection responsibilities and are also obliged to comply with the requirements of the GDPR and other applicable data protection regulations. In addition, they are bound by special confidentiality and secrecy obligations due to their professional position.",
    "In the event of corporate transactions (e.g., sale of our business or a part of it), we may transfer personal data to involved advisors or to potential buyers.",
    'Additionally, we also use services provided by various specialized companies, e.g., IT service providers, freelancers that process data on our behalf (hereinafter "<strong>Data Processors</strong>"). We have concluded a data processing agreement according to Art. 28 GDPR or EU standard contractual clauses of the EU Commission pursuant to Art. 46 para. 2 lit. c GDPR with each service provider and they only process data in accordance with our instructions and not for their own purposes.',
    "Our current Data Processors are:",
    "<table class='data-processors-table'><thead><tr><th>Data Processor</th><th>Purpose of commissioning the Data Processor / purpose of processing</th></tr></thead><tbody><tr><td>Scaleway.com</td><td>Hosting and Storage</td></tr><tr><td>Plausible.io</td><td>Website Analytics and Usage Data</td></tr><tr><td>Resend.com</td><td>Email provider</td></tr><tr><td>Grafana.com</td><td>Infrastructure monitoring and log aggregation</td></tr><tr><td>Stripe.com</td><td>Payment processing and invoicing</td></tr><tr><td>Gravatar.com</td><td>User avatar images</td></tr></tbody></table>",
  ])}
  {@render section("5. Links to social networks", [
    "Our Websites may link to social media profiles and may contain icons of social media providers (e.g., BlueSky). Those services might collect personal data. For further information on the purpose and scope of data collection and processing by the social media platform/provider, please review the privacy notices of these social media platforms/providers:",
    '<ul><li><a href="https://bsky.app" target="_blank" rel="noopener noreferrer">Bluesky</a></li><li><a href="https://joinmastodon.org" target="_blank" rel="noopener noreferrer">Mastodon</a></li><li><a href="https://x.com" target="_blank" rel="noopener noreferrer">Twitter / X</a></li><li><a href="https://www.discourse.org" target="_blank" rel="noopener noreferrer">Discourse</a></li><li><a href="https://telegram.org" target="_blank" rel="noopener noreferrer">Telegram</a></li><li><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a></li></ul>',
  ])}
  {@render section("6. Your rights", [
    "The following rights are available to you as a data subject in accordance with the provisions of the GDPR:",
  ])}
  {@render section("6.1 Right of revocation", [
    "You may revoke your consent to the processing of your personal data at any time pursuant to Art. 7 para. 3 GDPR. Please note, that the revocation is only effective for the future. Processing that took place before the revocation remains unaffected.",
  ])}
  {@render section("6.2 Right of access", [
    "Under the conditions of Art. 15 GDPR you have the right to request confirmation from us at any time as to whether we are processing personal data relating to you. If this is the case, you also have the right within the scope of Art. 15 GDPR to receive access to the personal data as well as certain other information about the personal data and a copy of your personal data. The restrictions of § 34 BDSG apply.",
  ])}
  {@render section("6.3 Right to rectification", [
    "Under the conditions of Art. 16 GDPR you have the right to request us to correct the personal data stored about you if it is inaccurate or incomplete.",
  ])}
  {@render section("6.4 Right to erasure", [
    "You have the right, under the conditions of Art. 17 GDPR, to demand that we delete the personal data concerning you without delay.",
  ])}
  {@render section("6.5 Right to restrict processing", [
    "You have the right to request that we restrict the processing of your personal data under the conditions of Art. 18 GDPR.",
  ])}
  {@render section("6.6 Right to data portability", [
    "You have the right, under the conditions of Art. 20 GDPR, to request that we hand over, in a structured, common and machine-readable format, the personal data concerning you that you have provided to us. Please note that this right only applies where the processing is based on your consent, or a contract and the processing is carried out by automated means.",
  ])}
  {@render section("6.7 Right to object", [
    "You have the right to object to the processing of your personal data under the conditions of Art. 21 GDPR.",
  ])}
  {@render section("6.8 Right to complain to a supervisory authority", [
    'Subject to the requirements of Art. 77 GDPR, you have the right to file a complaint with a competent supervisory authority. As a rule, the data subject may contact the supervisory authority of his or her habitual residence or place of work or place of the alleged infringement. A list of all German supervisory authorities and their contact details can be found <a href="https://www.bfdi.bund.de/EN/Service/Anschriften/Laender/Laender-node.html" target="_blank" rel="noopener noreferrer">here</a>.',
  ])}
  {@render section("7. Obligation to provide data", [
    "When you visit our Websites, you may be required to provide us with certain personal data as described in this privacy policy. Beyond that, you are under no obligation to provide us with personal data. However, if you do not provide us with your personal data as required, you may not be able to contact us and/or we may not be able to contact you to respond to your inquiries or questions.",
  ])}
  {@render section("8. Automated decisions/profiling", [
    "The processing of your personal data carried out by us does not contain any automated decisions in individual cases within the meaning of Art. 22 para. 1 GDPR.",
  ])}
  {@render section("9. Changes to this privacy policy", [
    'We review this privacy policy regularly and may update it at any time. If we make changes to this privacy policy, we will change the date of the last update above. Please review this privacy policy regularly to be aware of any updates. The current version of the privacy notice can be accessed at any time at <a href="/privacy">radicle.garden/privacy</a>.',
  ])}
</div>

<style>
  :global(a) {
    text-decoration: underline;
  }
  :global(ul) {
    list-style-type: disc;
    padding-left: 1rem;
  }
  :global(ul li) {
    margin-bottom: 0.5rem;
  }
  :global(.data-processors-table) {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
  }
  :global(.data-processors-table th),
  :global(.data-processors-table td) {
    border: 1px solid currentColor;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  :global(.data-processors-table th) {
    font-weight: 600;
  }
</style>
