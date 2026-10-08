import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/LegalPage";
import { organisation } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms for using the Restore 5 Paulett Ave website, giving to the restoration, and taking your part of the wall.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="The rules of the house"
      intro="Using this site means agreeing to what follows. It is written to be understood rather than to be impressive, because a promise you cannot read is not a promise."
      updated="8 September 2026"
    >
      <LegalSection title="Who you are dealing with">
        <p>
          Restore 5 Paulett Ave is the campaign to bring 5 Paulett Avenue in
          Ballymacarrett, East Belfast, back to life. It is run by{" "}
          {organisation.legalName}, who purchased the building and will occupy
          it.
        </p>
        <p>
          In these terms, “we” and “us” mean the church. “You” means anyone
          using this site. Write to us at{" "}
          <a
            href={`mailto:${organisation.email}`}
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            {organisation.email}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Three ways to build">
        <p>
          There are three things you can do here, and these terms cover all of
          them.
        </p>
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-pvn-navy">Give.</strong> A
              one-off or regular gift to the restoration.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                Start my fundraiser.
              </strong>{" "}
              Set a target and ask your people to help build your part of the
              wall.
            </>,
            <>
              <strong className="font-semibold text-pvn-navy">
                Join a fundraiser.
              </strong>{" "}
              Build alongside your family, your ministry, your alumni group or
              your friends.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Giving">
        <LegalList
          items={[
            <>
              Every gift funds the restoration of 5 Paulett Avenue and the work
              of the church there. Money given through a fundraiser counts
              toward that fundraiser and toward the same single restoration
              fund. Your fundraiser, our house.
            </>,
            <>
              Gifts are voluntary. Nothing is sold on this site, and you receive
              no goods or services in return.
            </>,
            <>
              Because a gift is not a purchase, it cannot normally be refunded.
              If you gave by mistake — the wrong amount, or twice — tell us
              within fourteen days and we will put it right.
            </>,
            <>
              Payments are handled by Stripe. You must be entitled to use the
              card or account you pay with.
            </>,
            <>
              Gift Aid may only be claimed if you are a UK taxpayer and have
              paid at least as much income or capital gains tax in that year as
              every charity you support will reclaim. If that changes, tell us.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Where the money goes">
        <p>
          The work is divided into areas: roof and structure, stonework and
          exterior, windows, heating and electrical, the worship space, children
          and youth spaces, and community facilities.
        </p>
        <p>
          You may give toward a particular area. If that area is completed,
          over-funded, or turns out not to be needed, we will apply your gift
          elsewhere in the restoration rather than leave it sitting idle. We
          will say so publicly when we do.
        </p>
      </LegalSection>

      <LegalSection title="Taking your part of the wall">
        <p>
          A fundraiser is your part of the wall — a page carrying your name, your
          story, your photograph and your target, which you share with your own
          circle. An individual, a family, an alumni group, a ministry or any
          other group can hold one.
        </p>
        <p>In starting a fundraiser you agree that:</p>
        <LegalList
          items={[
            <>
              What you write is true and is your own. Only upload photographs
              you have the right to use, and ask permission before posting a
              picture of someone else.
            </>,
            <>
              Money given to your fundraiser goes directly to the church. It never
              passes through your hands, and you cannot withdraw it.
            </>,
            <>
              A fundraiser is for the restoration and nothing else. It may not be used
              to promote a business, a political campaign, or another cause.
            </>,
            <>
              We may edit or remove a fundraiser that breaks these terms, misleads
              people, or brings the restoration into disrepute. Where we can, we
              will tell you why first.
            </>,
            <>
              You give us permission to show what you submit on this site and in
              materials about the campaign. It stays yours.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="How givers are named">
        <p>
          We do not rank donors, and we never will. There is no leaderboard by
          amount and no tier of names by wealth. What is shown is a mosaic of
          many people building their part.
        </p>
        <p>
          Your name appears against a fundraiser unless you choose to give anonymously,
          in which case only the amount is shown. You can ask us to change that
          at any time.
        </p>
      </LegalSection>

      <LegalSection title="Using the site properly">
        <p>You agree not to:</p>
        <LegalList
          items={[
            <>
              Post anything unlawful, abusive, hateful, obscene, or designed to
              deceive.
            </>,
            <>
              Attempt to break, overload, scrape, or gain unauthorised access to
              the site or the systems behind it.
            </>,
            <>
              Impersonate another person, or claim a connection to the church
              that you do not have.
            </>,
            <>Use the site in any way that breaks the law.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="What belongs to whom">
        <p>
          The name Place of Victory for All Nations, the Restore 5 Paulett Ave
          campaign identity, and the text, photographs and design of this site
          belong to us or to those who licensed them to us. Read them, print
          them, share them to tell people about the restoration. Do not
          republish them commercially or present them as your own.
        </p>
        <p>
          Historic material about First Ballymacarrett Presbyterian Church and
          Ballymacarrett is published here for heritage and educational
          purposes. Some of it belongs to archives and families who allowed us
          to use it. Ask us before reusing it.
        </p>
      </LegalSection>

      <LegalSection title="What we can and cannot promise">
        <p>
          We will keep this site accurate and available as best we can. We
          cannot promise it will never be offline or never contain a mistake.
          Totals may lag slightly behind reality while payments settle.
        </p>
        <p>
          Nothing here limits our liability for death or personal injury caused
          by our negligence, for fraud, or for anything else the law does not
          allow us to limit. Beyond that, we are not liable for indirect losses
          arising from your use of the site.
        </p>
      </LegalSection>

      <LegalSection title="Links to other places">
        <p>
          Where we link to another website, we do so because we think it is
          useful. We do not control those sites and are not responsible for what
          they contain or what they do with your information.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          The restoration will run for years and these terms will change with
          it. The current version always sits on this page with its date at the
          top. Changes apply from the day they are published. They do not alter
          the terms that applied to a gift already made.
        </p>
      </LegalSection>

      <LegalSection title="Which law applies">
        <p>
          These terms are governed by the law of Northern Ireland, and the
          courts of Northern Ireland have jurisdiction over any dispute arising
          from them.
        </p>
      </LegalSection>

      <LegalSection title="Related pages">
        <p>
          How we handle your information is set out in our{" "}
          <Link
            href="/privacy"
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            privacy notice
          </Link>
          , and what is stored on your device in our{" "}
          <Link
            href="/cookies"
            className="text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            cookie notice
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
