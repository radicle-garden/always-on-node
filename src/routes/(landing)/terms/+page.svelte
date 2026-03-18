<script lang="ts">
</script>

<svelte:head>
  <title>Terms of Service | Radicle Garden</title>
</svelte:head>

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
  <div class="txt-heading-xxxl">Platform Agreement</div>
  <div class="txt-heading-xxl text-text-quarternary">
    Last updated: 10 February 2026
  </div>
</div>
<div class="flex w-full flex-col gap-12">
  {@render section("Parties", [
    `Monadic Works GmbH, Gneisenaustraße 48, 10961 Berlin, Germany – "<strong>Monadic</strong>" –`,
    `[Customer] – "<strong>Customer</strong>" –`,
    `Both Monadic and Customer each a "<strong>Party</strong>" and together the "<strong>Parties</strong>".`,
  ])}
  {@render section("Background", [
    `<strong>( A )</strong> Monadic offers the radicle.garden Product platform that allows the Customer to set up virtual servers for use-case specific application ("<strong>Radworks Product Server</strong>").`,
    `<strong>( B )</strong> Radworks Product Servers leverage preconfigured software packages for the Customer to install on the platform to simplify the setup process and ensure reliability. Monadic will maintain the Customer's Radworks Product Server on the Customer's behalf.`,
    `<strong>( C )</strong> Customer wants to enjoy the advantages offered by the Radworks Product Server by entering into this agreement ("<strong>Agreement</strong>").`,
  ])}
  {@render section("1. Subject Matter of the Agreement", [
    `<strong>1.1</strong> The subject matter of this Agreement is the granting of access rights to the Radworks Product Server together with storage space in return for a fee and limited to the duration of this Agreement.`,
    `<strong>1.2</strong> This Agreement applies to all services, including future services of Monadic in connection with the provision of the Radworks Product Server, storage space, the operation of portals, interfaces and additional services as well as related support services to the Customer ("<strong>Service</strong>").`,
    `<strong>1.3</strong> The Service includes, in particular, access to the Radworks Product Server and is further described on Radworks Product's website. Monadic will provide deployment, maintenance and operation services regarding the Radworks Product Server.`,
    `<strong>1.4</strong> Conflicting or additional contractual conditions of the Customer shall only apply if Monadic expressly confirms them in writing.`,
  ])}
  {@render section("2. Rights of Use", [
    `<strong>2.1</strong> Monadic shall retain its exclusive rights to the Service, the Radworks Product Server, its website or underlying software. For the avoidance of doubt, in case any of the foregoing or any part thereof was open-sourced prior to the signing of this Agreement by both Parties, the open-source license under which the respective object was made available shall remain unaffected by this Agreement.`,
    `<strong>2.2</strong> Subject to the provisions of this Agreement, Monadic grants Customer, including its employees authorized to use the Service, a non-exclusive, non-transferable and non-sublicensable right to access and use the Service during the term of the Agreement pursuant to Section 11 ("<strong>Radworks Product Server License</strong>").`,
    `<strong>2.3</strong> Customer shall receive access to the Service via internet browser. Unless otherwise expressly agreed in writing between the Parties, Customer shall not be granted any further rights to the Service or underlying software or infrastructure.`,
  ])}
  {@render section("3. Provision of Services; Customer Data", [
    `<strong>3.1</strong> Scope and functionality of the Services will be provided on Radworks Product's website. The Services are continuously developed further and improved. Monadic may upon its own discretion, taking the Customer's reasonable interests into account, add or remove functions to the Services.`,
    `<strong>3.2</strong> Monadic shall provide the Customer with access to the Service by means of a customer account.`,
    `<strong>3.3</strong> During the term of this Agreement, Monadic may provide storage space on the Radworks Product Server for the Customer using the Service and/or data required for the use of the Service ("<strong>Customer Data</strong>"). Further conditions as indicated on Radworks Product's website apply.`,
    `<strong>3.4</strong> The Customer grants Monadic the non-exclusive right to use Customer Data for the performance of Monadic's obligations under this Agreement, and to store, reproduce, make publicly available, modify and combine with other material Customer Data for the purpose of providing the Service. Additionally, Customer allows Monadic, after diligent anonymization, to use Customer Data to prepare analyses and benchmarks for the further development of the Services.`,
    `<strong>3.5</strong> The Customer shall bear sole responsibility for all Customer Data, in particular for ensuring that its transmission to and use by Monadic within the scope of this Agreement does not violate applicable law, including the General Data Protection Regulation ("<strong>GDPR</strong>"), and/or industrial property rights or other rights of third parties. Section 6 remains unaffected.`,
    `<strong>3.6</strong> Customer agrees to indemnify, defend, and hold harmless Monadic from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorney's fees) arising out of or in connection with any third-party claims alleging that Monadic's use of Customer Data in accordance with this Agreement infringes or misappropriates any third party's intellectual property or other rights.`,
  ])}
  {@render section("4. Support", [
    `<strong>4.1</strong> The provision of support services by Monadic shall be subject to separate agreement of the Parties.`,
  ])}
  {@render section("5. Obligations of the Customer", [
    `<strong>5.1</strong> Prior to the usage of the Radworks Product Server, Customer must install and configure software packages as specified on the landing page of the Radworks Product Server ("<strong>Setup</strong>"). The Setup is a responsibility of Customer. Where required and upon Customer's request, Monadic shall support with the Setup.`,
    `<strong>5.2</strong> Customer commits to using the Service only in accordance with the acceptable use policy as specified in Section 6.`,
    `<strong>5.3</strong> The Customer shall take reasonable precautions to protect the Service from unauthorized use. Customer is obliged to keep information used to access the Service (such as user IDs and passwords) secret and not to make it accessible to unauthorized third parties. Compliance with these terms and conditions shall be expressly requested from the individual users authorized to use the Service.`,
    `<strong>5.4</strong> The Customer shall inform Monadic without undue delay as soon as it becomes aware of the infringement of an industrial property right or copyright in the Service or the disclosure of user IDs or passwords to unauthorized users.`,
  ])}
  {@render section("6. Acceptable Use", [
    `<strong>6.1</strong> The Customer shall not use the Service improperly or allow it to be used improperly, and in particular shall not use on the Radworks Product Server any content that is illegal or immoral and/or such content that serves to incite hatred, incites criminal acts or glorifies or trivializes violence, is sexually offensive or pornographic, is capable of seriously endangering children or young people morally or impairing their well-being or may damage the reputation of Monadic, and shall not refer to such content.`,
    `<strong>6.2</strong> When using the Service, the Customer shall comply with the applicable data protection laws, in particular obtain the required consent of the respective data subject, insofar as the Customer collects, processes or uses personal data when using the Service and no other statutory permissible circumstance applies.`,
    `<strong>6.3</strong> The Customer shall ensure that it observes (e.g. when transmitting texts/data/code of third parties and/or any Customer Data to the Radworks Product Server) all rights of third parties to material used by the Customer, including in particular copyrights and related rights of third parties.`,
    `<strong>6.4</strong> Customer shall refrain from using the Services to upload, transmit or otherwise allow to be transmitted to the Radworks Product Server any material or Customer Data which contains computer programs that may damage software or hardware or interfere with computer use, viruses, or other malware. Customer shall further refrain from taking any actions aimed at circumventing technical protective measures of the Service and from any unauthorized use of the Services, particularly attempts to overcome or disable the security mechanisms of the Service, as well as from using/spreading viruses, worms, trojans, brute-force attacks, spam, or links, programs, or procedures that may harm Monadic, other companies, or the Service.`,
    `<strong>6.5</strong> Customer agrees to indemnify, defend, and hold harmless Monadic from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorney's fees) arising out of or in connection with any alleged violation of this Section 6 by Customer, including, in particular, any third-party claims against Monadic alleging that the Customer's use of the Service infringes or misappropriates any third party's intellectual property or other rights.`,
  ])}
  {@render section("7. Blocking of Access", [
    `<strong>7.1</strong> Monadic is entitled to block access to the Service temporarily or permanently if there are concrete indications that the Customer or one of its employees is violating or has violated this Agreement and/or applicable law or if Monadic has another justified interest in the blocking. When deciding on a blocking, Monadic shall give due consideration to the legitimate interests of the Customer. The blocking shall continue until the contractual or legal violation has been remedied in an appropriate manner.`,
  ])}
  {@render section("8. Prices and Payment", [
    `<strong>8.1</strong> For the provision of the Service, Customer shall pay to Monadic a monthly service fee separately to be agreed between the Parties.`,
    `<strong>8.2</strong> Unless otherwise agreed between the Parties, the monthly service fee shall be due upon invoicing by Monadic.`,
  ])}
  {@render section("9. Limitation of Liability", [
    `<strong>9.1</strong> Monadic shall be liable without limitation for damage caused intentionally or by gross negligence.`,
    `<strong>9.2</strong> The liability for damages caused by simple negligence shall be limited to the amount of overall fees paid by the Customer to Monadic under this Agreement until the day of the damaging event.`,
    `<strong>9.3</strong> In all other cases, liability of Monadic shall be excluded.`,
    `<strong>9.4</strong> Insofar as the liability according to this Section 9 is excluded or limited, this shall also apply to the personal liability of Monadic's employees, representatives and vicarious agents.`,
    `<strong>9.5</strong> In particular, in the event of disruptions to the technical infrastructure or the Internet connection, Monadic shall be released from its obligation to perform. This also applies if Monadic is prevented from performing due to force majeure or other circumstances, the elimination of which is not possible or economically reasonable for Monadic.`,
  ])}
  {@render section("10. Data Protection", [
    `<strong>10.1</strong> The applicable data protection regulations apply, in particular those of the General Data Protection Regulation or the German Federal Data Protection Act. For information on the processing of the Customer's personal data, please refer to the <a href="/privacy">privacy policy</a>.`,
  ])}
  {@render section("11. Term; Termination of Contract", [
    `<strong>11.1</strong> The term of the Agreement shall start upon signature by both Parties. Unless otherwise expressly agreed between the Parties, the term of the contract shall be one (1) month ("<strong>Contract Term</strong>"). The Contract Term shall be automatically extended by terms of one (1) month if it is not terminated in writing by either Party no later than one (1) day before the expiry of the respective term.`,
    `<strong>11.2</strong> Monadic may in the case of default of payment of the service fee by the Customer, terminate the Agreement upon notification by Monadic immediately after a 14-days grace period.`,
    `<strong>11.3</strong> Monadic may terminate the Agreement, if the Customer violates a material obligation under the Agreement and does not remedy such breach within a reasonable time upon notice of Monadic.`,
    `<strong>11.4</strong> Notice of termination must be given in text form (e.g via email).`,
  ])}
  {@render section("12. Independent Contractors", [
    `<strong>12.1</strong> The Parties are independent of each other. There is no company, joint venture or comparable legal relationship between the Parties. Neither Party is authorized to represent the other Party in legal transactions. Each Party is authorized to instruct, supervise and issue instructions exclusively to its own personnel. The employees of one Party are at no time integrated into the operational and work organization of the other Party.`,
  ])}
  {@render section("13. Final Provisions", [
    `<strong>13.1</strong> Should individual provisions of the contract be or become invalid in whole or in part, this shall not affect the validity of the remaining provisions.`,
    `<strong>13.2</strong> The exclusive place of jurisdiction for all disputes arising from or in connection with the contract is Berlin.`,
    `<strong>13.3</strong> The law of the Federal Republic of Germany shall apply except for its provisions on the choice of law which would lead to the application of another legal system. The application of the CISG (UN Sales Convention) is excluded.`,
  ])}
</div>

<style>
  :global(a) {
    text-decoration: underline;
  }
</style>
