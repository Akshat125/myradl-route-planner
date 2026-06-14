import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

// ── Operator details (edit here) ───────────────────────────────────────────
const OPERATOR = {
  name: 'Akshat Tandon',
  street: 'Willi-Graf-Straße 17',
  city: '80805 München',
  country: 'Deutschland',
}

const LAST_UPDATED = 'Juni 2026'

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <a
        href="#/"
        className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-xl text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to planner
      </a>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <div className="space-y-6 text-sm leading-relaxed text-muted">{children}</div>
    </main>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-1.5 text-base font-semibold text-foreground">{children}</h2>
}

export function Impressum() {
  return (
    <LegalLayout title="Impressum">
      <section>
        <p>Angaben gemäß § 18 Abs. 1 Medienstaatsvertrag (MStV):</p>
        <p className="mt-2">
          {OPERATOR.name}
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.city}
          <br />
          {OPERATOR.country}
        </p>
      </section>

      <section>
        <SectionHeading>Hinweis</SectionHeading>
        <p>
          Dieses Angebot steht in keiner Verbindung zu MyRadl, zum MVV, zur MVGO-App oder zu
          Nextbike. Alle genannten Namen und Marken gehören ihren jeweiligen Inhabern und werden nur
          zur Beschreibung des Dienstes verwendet.
        </p>
      </section>
    </LegalLayout>
  )
}

export function Datenschutz() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <section>
        <SectionHeading>1. Verantwortlicher</SectionHeading>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:
          <br />
          {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}, {OPERATOR.country}
        </p>
      </section>

      <section>
        <SectionHeading>2. Grundsatz</SectionHeading>
        <p>
          Dieser Dienst ist auf Datensparsamkeit ausgelegt. Es gibt keine Benutzerkonten, keine
          Werbung, keine Tracking- oder Analyse-Tools und keine Cookies zu Marketingzwecken. Es
          werden nur die Daten verarbeitet, die zur Routenplanung notwendig sind.
        </p>
      </section>

      <section>
        <SectionHeading>3. Verarbeitete Daten und Zwecke</SectionHeading>
        <p className="mt-1">
          <strong className="font-medium text-foreground">a) Standort.</strong> Wenn Sie die
          Standortfunktion nutzen, fragt Ihr Browser nach Ihrer Zustimmung. Die Koordinaten werden im
          Browser verwendet und zur Routenberechnung an unseren Server sowie den Routing-Dienst
          gesendet. Sie werden nicht dauerhaft gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. a
          DSGVO (Einwilligung).
        </p>
        <p className="mt-2">
          <strong className="font-medium text-foreground">b) Adress-Suche.</strong> Ihre Eingaben im
          Suchfeld werden zur Adressauflösung an den Geocoding-Dienst Photon (Komoot) übermittelt.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Bereitstellung der Suchfunktion).
        </p>
        <p className="mt-2">
          <strong className="font-medium text-foreground">c) Routenberechnung.</strong> Start- und
          Zielkoordinaten werden zur Berechnung von Wegzeiten und Routen an OpenRouteService (HeiGIT)
          übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <p className="mt-2">
          <strong className="font-medium text-foreground">d) Karte.</strong> Die Kartendarstellung
          lädt Kartenkacheln von OpenStreetMap (heller Modus) bzw. CARTO (dunkler Modus). Dabei wird
          Ihre IP-Adresse technisch bedingt an die jeweiligen Anbieter übermittelt. Rechtsgrundlage:
          Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <p className="mt-2">
          <strong className="font-medium text-foreground">e) Server-Logs.</strong> Beim Aufruf der
          Website verarbeiten unsere Hosting-Dienstleister technisch notwendige Daten (u. a.
          IP-Adresse, Zeitpunkt, angefragte Ressource) zur Auslieferung und Sicherheit.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <p className="mt-2">
          <strong className="font-medium text-foreground">f) Feedback-Formular.</strong> Wenn Sie
          Feedback senden, werden Ihre Nachricht, optional Ihre E-Mail-Adresse sowie der technische
          Routenkontext zur Bearbeitung als Issue bei GitHub gespeichert. Ihre IP-Adresse wird nur
          kurzzeitig zur Missbrauchsvermeidung (Rate-Limit) verwendet und nicht dauerhaft
          gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO bzw. lit. a DSGVO bei Angabe der
          E-Mail-Adresse.
        </p>
        <p className="mt-2">
          <strong className="font-medium text-foreground">g) Externe Navigations-Links.</strong> In
          den Ergebnissen werden Links zu Google Maps angeboten. Erst wenn Sie einen solchen Link
          anklicken, werden die betreffenden Koordinaten an Google übertragen. Rechtsgrundlage:
          Art. 6 Abs. 1 lit. f DSGVO.
        </p>
      </section>

      <section>
        <SectionHeading>4. Empfänger und Drittlandübermittlung</SectionHeading>
        <p>Zur Bereitstellung des Dienstes werden Daten an folgende Dienstleister übermittelt:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Photon / Komoot (Geocoding) – EU</li>
          <li>OpenRouteService / HeiGIT (Routing) – Deutschland</li>
          <li>OpenStreetMap Foundation (Karten) – EU/UK</li>
          <li>CARTO (Karten-Stil im dunklen Modus) – USA</li>
          <li>Google (nur bei Klick auf einen Karten-Link) – USA</li>
          <li>GitHub, Inc. (Feedback) – USA</li>
          <li>Vercel Inc. (Hosting Frontend) – USA</li>
          <li>Railway Corp. (Hosting Backend) – USA</li>
        </ul>
        <p className="mt-2">
          Bei Anbietern in den USA kann eine Übermittlung in ein Drittland erfolgen (Art. 44 ff.
          DSGVO). Die Übermittlung wird, soweit erforderlich, auf geeignete Garantien gestützt,
          insbesondere EU-Standardvertragsklauseln bzw. das EU-US Data Privacy Framework.
        </p>
      </section>

      <section>
        <SectionHeading>5. Speicherdauer</SectionHeading>
        <p>
          Der Dienst speichert keine Routenanfragen dauerhaft. Feedback-Nachrichten bleiben so lange
          gespeichert, wie es zur Bearbeitung erforderlich ist. Für Server-Logs gelten die
          Löschfristen der jeweiligen Hosting-Dienstleister.
        </p>
      </section>

      <section>
        <SectionHeading>6. Cookies und lokale Speicherung</SectionHeading>
        <p>
          Es werden keine Tracking-Cookies eingesetzt. Lediglich Ihre Anzeige-Einstellung (heller
          oder dunkler Modus) wird technisch notwendig im lokalen Speicher Ihres Browsers
          (localStorage) abgelegt. Eine Einwilligung ist hierfür nicht erforderlich.
        </p>
      </section>

      <section>
        <SectionHeading>7. Ihre Rechte</SectionHeading>
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung. Eine erteilte Einwilligung
          können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Sie haben zudem das Recht,
          sich bei einer Aufsichtsbehörde zu beschweren, z. B. beim Bayerischen Landesamt für
          Datenschutzaufsicht (BayLDA).
        </p>
      </section>

      <p className="text-xs">Stand: {LAST_UPDATED}</p>
    </LegalLayout>
  )
}
