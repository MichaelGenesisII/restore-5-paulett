import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/LegalPage";
import { organisation } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Place of Victory for All Nations Belfast does with your personal information when you give, take your part of the wall, or write to us.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Your details, and what we do with them"
      intro="You are trusting us with money, with your name, and sometimes with your memories. This page sets out plainly what we hold, why we hold it, and how to make us stop."
      updated="26 September 2026"
    >
      <LegalSection title="Who is responsible">
        <p>
          {organisation.legalName} is the data controller for this site. We
          decide what personal information is collected here and why.
        </p>
        <p>
          Our address is {organisation.addressLines.join(", ")}. Write to us at{" "}
          <a
            href={`mailto:${organisation.email}`}
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            {organisation.email}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Nothing is taken. It is only ever given">
        <p>
          Browsing this site collects nothing about you. Every item below is
          something you typed into a form and chose to send.
        </p>
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-pvn-navy">
                When you give:
              </strong>{" "}
              your name and email, the amount, whether you wish to be shown as
              anonymous, and any message you attach. If you claim Gift Aid, we
              also need your home address and postcode, because HMRC requires
              it.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                When you take your part of the wall:
              </strong>{" "}
              your name and email, the story you write, any photograph you
              upload, and your target.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                If you are alumni:
              </strong>{" "}
              the years you were with PVN, your ministry, and the city and
              country you are in now — but only if you tell us. It is how people
              find their year, their ministry and their friends again.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                When you write to us:
              </strong>{" "}
              your name, your email and your message.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                If you allow analytics cookies:
              </strong>{" "}
              a random id on your device so we can count visits to pot pages
              without storing your name. Hosts see totals and share sources, not
              who visited. Off unless you say yes — see the{" "}
              <Link
                href="/cookies"
                className="underline decoration-pvn-gold decoration-2 underline-offset-4"
              >
                cookie notice
              </Link>
              .
            </>,
          ]}
        />
        <p>
          We never see or store your card number. Card details go straight to
          Stripe, and all we receive back is a reference saying the payment
          succeeded.
        </p>
      </LegalSection>

      <LegalSection title="Photographs, stories and heritage">
        <p>
          Part of this restoration is preserving the story of 5 Paulett and of
          Ballymacarrett — through exhibitions, schools work, oral histories and
          public access. That work involves people, so it involves personal
          information.
        </p>
        <LegalList
          items={[
            <>
              We ask before recording an oral history, and we tell you where it
              may be used. You can withdraw it later.
            </>,
            <>
              We ask permission before publishing a photograph in which someone
              is identifiable, and we take particular care with children.
            </>,
            <>
              Historic records and photographs shared with us by families and
              archives are held for heritage purposes and credited where we are
              asked to credit them.
            </>,
            <>
              If you would rather not appear, say so. We will take you out, and
              you do not have to give a reason.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Watching the ruins rise">
        <p>
          We do not want anyone to give once and disappear. If you ask for them,
          we will send updates on the restoration — photographs, progress, what
          has been spent, and milestones as they are reached.
        </p>
        <p>
          That is consent-based and separate from giving. You will never be
          added because you donated, and every message carries a way out. Ask us
          to stop and we stop.
        </p>
      </LegalSection>

      <LegalSection title="Why we are allowed to hold it">
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-pvn-navy">Contract.</strong>{" "}
              To take your gift, issue a receipt, and run the pot you created.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                Legal obligation.
              </strong>{" "}
              Charity and tax law requires records of donations, and Gift Aid
              declarations must be kept for HMRC.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                Legitimate interests.
              </strong>{" "}
              To answer your message, keep the site secure, and keep an honest
              public account of the restoration.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">Consent.</strong>{" "}
              For everything optional — updates, oral histories, photographs,
              and cookies beyond the necessary. Withdraw it at any time.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Who else sees it">
        <p>
          We do not sell your information and we never will. It is shared only
          with the organisations that make this work:
        </p>
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-pvn-navy">Stripe</strong> —
              processes card payments.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">Supabase</strong>{" "}
              — hosts the database behind this site.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">HMRC</strong> —
              receives Gift Aid declarations, where you have made one.
            </>,
            <>
              Professional advisers, auditors and regulators, where the law
              requires it of us.
            </>,
          ]}
        />
        <p>
          Some providers run servers outside the United Kingdom. Where
          information leaves the UK, it is protected by the safeguards UK data
          protection law requires.
        </p>
      </LegalSection>

      <LegalSection title="What is public, and what is not">
        <p>
          Pots are public by design. The title, the story, the photograph and
          the running total are visible to anyone — that is how a pot gathers
          people.
        </p>
        <p>
          Your name appears against a gift unless you give anonymously, in which
          case only the amount is shown. Your email address, your postal address
          and your Gift Aid declaration are never published. We do not rank
          donors by amount.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <LegalList
          items={[
            <>
              Donation records and Gift Aid declarations: six full tax years
              after the gift, as tax law requires.
            </>,
            <>
              Pots and the stories on them: while the pot is live, and
              afterwards as part of the record of how this house was rebuilt.
            </>,
            <>
              Heritage material — oral histories, photographs, archive records:
              kept as a permanent record, unless you ask us to remove yours.
            </>,
            <>Messages sent through the contact form: up to two years.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Under UK data protection law you may ask us to show you what we hold,
          correct it, delete it, restrict what we do with it, hand it to you in
          a portable form, or object to our using it. You may withdraw consent
          at any time. There is no charge, and we will answer within one month.
        </p>
        <p>
          Some rights have limits. We cannot delete a donation record the law
          requires us to keep — but we can take your name off public display.
        </p>
        <p>
          Write to{" "}
          <a
            href={`mailto:${organisation.email}?subject=${encodeURIComponent(
              "Data request",
            )}`}
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            {organisation.email}
          </a>{" "}
          to use any of them.
        </p>
      </LegalSection>

      <LegalSection title="If we get it wrong">
        <p>
          Tell us first and we will try to put it right. If you are still
          unhappy, you can complain to the Information Commissioner’s Office,
          the UK’s independent authority for data protection, at{" "}
          <a
            href="https://ico.org.uk/make-a-complaint/"
            target="_blank"
            rel="noreferrer"
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            ico.org.uk
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Related pages">
        <p>
          What is stored on your device is covered in our{" "}
          <Link
            href="/cookies"
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            cookie notice
          </Link>
          , and the rules for using this site are in our{" "}
          <Link
            href="/terms"
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            terms
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
