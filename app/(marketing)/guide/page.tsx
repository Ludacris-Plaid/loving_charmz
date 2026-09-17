import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'How To Run The Shop — The Loving Charmz Guide',
};

const CHAPTERS = [
  { id: 'start', label: 'Start here' },
  { id: 'signing-in', label: '1. Signing in' },
  { id: 'getting-around', label: '2. Getting around' },
  { id: 'morning', label: '3. Your morning routine' },
  { id: 'orders', label: '4. Orders' },
  { id: 'products', label: '5. Adding a product' },
  { id: 'pictures', label: '6. Pictures' },
  { id: 'collections', label: '7. Collections' },
  { id: 'inventory', label: '8. Stock' },
  { id: 'mailing-list', label: '9. Mailing list' },
  { id: 'discounts', label: '10. Discount codes' },
  { id: 'custom-orders', label: '11. Custom orders' },
  { id: 'customers', label: '12. Customers' },
  { id: 'content', label: '13. Content blocks' },
  { id: 'collections-page', label: '14. Website pages' },
  { id: 'numbers', label: '15. Numbers page' },
  { id: 'stuck', label: '16. When things go wrong' },
  { id: 'emergency', label: 'Emergency card' },
];

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-semibold text-plum-900 pt-10 pb-3">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-lg font-semibold text-plum-800 pt-6 pb-2">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-800 leading-relaxed py-1.5">{children}</p>;
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="badge-plum shrink-0 mt-0.5">{n}</span>
      <span className="text-ink-800 leading-relaxed">{children}</span>
    </li>
  );
}

function OList({ children }: { children: React.ReactNode }) {
  return <ol className="my-3 space-y-1">{children}</ol>;
}

function UList({ children }: { children: React.ReactNode }) {
  return <ul className="my-3 space-y-1">{children}</ul>;
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-1 text-ink-800 leading-relaxed">
      <span className="badge-mint shrink-0 mt-0.5">•</span>
      <span>{children}</span>
    </li>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-soft p-4 my-4 text-ink-800 leading-relaxed">
      <strong className="text-plum-800">Handy to know:</strong> {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-red-300 bg-red-50 p-4 my-4 text-ink-800 leading-relaxed">
      <strong className="text-red-700">Careful:</strong> {children}
    </div>
  );
}

function Ex({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-card p-4 my-4 border-l-4 border-plum-300 text-ink-800 leading-relaxed">
      <strong className="text-plum-800">Example:</strong> {children}
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="surface-card p-4 my-3">
      <p className="font-semibold text-plum-900">{q}</p>
      <p className="text-ink-700 mt-2 leading-relaxed">{a}</p>
    </div>
  );
}

function GoldenRule() {
  return (
    <div className="border-l-4 border-plum-400 bg-plum-50 p-4 my-4 text-ink-800 leading-relaxed">
      <strong className="text-plum-800">The Golden Rule:</strong> you cannot break the
      store by clicking around and looking. The only buttons that change anything are
      the ones that say <strong>Save</strong>, <strong>Create</strong>, or{' '}
      <strong>Delete</strong> — and this guide tells you exactly when to press them.
      When in doubt, press nothing.
    </div>
  );
}

function TROUBLE({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-card p-5 my-5 border-l-4 border-mint-400">
      <p className="font-display font-semibold text-plum-900 mb-2">Troubleshooting</p>
      {children}
    </div>
  );
}

export default function GuidePage() {
  return (
    <Container className="py-12">
      <div className="max-w-3xl mx-auto">
        {/* ============ COVER ============ */}
        <span className="badge-plum">For the shop owner</span>
        <h1 className="font-display text-4xl font-semibold text-plum-900 mt-4 sm:text-5xl">
          How To Run The Shop
        </h1>
        <p className="text-lg text-ink-700 mt-4 leading-relaxed">
          A complete, plain-language guide to the Loving Charmz admin area. Written for
          absolute beginners — no computer experience needed. Take your time, follow one
          step at a time, and remember the Golden Rule below.
        </p>
        <GoldenRule />

        <Tip>
          Want this on paper? Press the <strong>Ctrl</strong> key and the{' '}
          <strong>P</strong> key at the same time (⌘ and P on a Mac) to print this whole
          guide. Keep it next to the computer.
        </Tip>

        <H3>What is in this guide</H3>
        <nav className="surface-card p-5 my-4 grid sm:grid-cols-2 gap-x-6">
          {CHAPTERS.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="py-1.5 text-plum-700 hover:text-plum-900 hover:underline motion-base text-sm"
            >
              {c.label}
            </a>
          ))}
        </nav>

        {/* ============ START ============ */}
        <div id="start">
          <H>Start here: five things to know before anything else</H>
          <UList>
            <LI>
              <strong>You reach the admin area through the shop itself</strong> — no
              secret addresses to type. Go to loving-charmz.vercel.app, click{' '}
              <strong>ACCOUNT</strong> (top right corner), sign in, then click the
              purple <strong>Admin dashboard</strong> button on your account page.
              Chapter 1 walks you through it, one step at a time.
            </LI>
            <LI>
              <strong>Your password is yours alone.</strong> Never text it, never write
              it on a sticky note on the monitor. If you think someone else has seen it,
              we can change it in two minutes.
            </LI>
            <LI>
              <strong>Orange (plum) text means clickable.</strong> If words on the page
              are in the shop&rsquo;s purple colour, you can tap or click them. Words in
              plain black are just labels.
            </LI>
            <LI>
              <strong>Nothing is lost forever by accident</strong> — except deleting.
              The only button in the whole admin that acts instantly is{' '}
              <strong>Delete</strong>. Every other change waits for you to press Save.
            </LI>              <LI>
                <strong>You cannot break the internet.</strong> Worst case, we undo a
                change together. Take your time. There is no timer, no alarm, and nobody
                watching over your shoulder.
              </LI>
              <LI>
                <strong>Stuck anyway?</strong> Phone your wonderful loving son. That is
                not an admission of defeat — it is literally what he is for.
              </LI>
          </UList>
        </div>

        {/* ============ SIGNING IN ============ */}
        <div id="signing-in">
          <H>1. Signing in</H>
          <P>
            Think of the admin area as a private room behind the shop. Your key is your
            email and password.
          </P>
          <OList>
            <Step n="1">
              Open your internet browser (Chrome, Safari, or Edge — whichever you
              normally use).
            </Step>
            <Step n="2">
              In the long white bar at the very top of the screen, type:{' '}
              <strong>loving-charmz.vercel.app</strong> and press Enter. That is the
              shop itself — the one customers see.
            </Step>
            <Step n="3">
              Look at the <strong>top right corner</strong> of the shop. There is a
              button that says <strong>ACCOUNT</strong>. (If it says{' '}
              <strong>Sign in</strong> instead, click that and skip ahead to step 5.)
            </Step>
            <Step n="4">
              Click <strong>ACCOUNT</strong>, then click{' '}
              <strong>My account</strong> in the little list that opens.
            </Step>
            <Step n="5">
              You are now on your <strong>My account</strong> page. Look at the{' '}
              <strong>left side</strong>: there is a purple button that says{' '}
              <strong>Admin dashboard</strong> with the word STAFF on it. It is the
              only purple button there — you cannot miss it. Click it.
            </Step>
            <Step n="6">
              If you were asked to sign in along the way: type your{' '}
              <strong>email</strong> and click <strong>Continue</strong>, then type
              your <strong>password</strong> (the little eye symbol 👁 shows what you
              typed so you can check for typos) and click <strong>Sign in</strong>.
              Then click the purple <strong>Admin dashboard</strong> button.
            </Step>
            <Step n="7">
              You know you are in the right place when the word{' '}
              <strong>Admin</strong> appears at the top and a list of pages —
              Overview, Products, Orders and so on — runs down the left side. That
              list is your toolbox; the rest of this guide explains each one.
            </Step>
          </OList>
          <Tip>
            If the browser asks &ldquo;Do you want to save this password?&rdquo; — say
            <strong> yes</strong> if it is your own computer. That way you only have to
            remember it once.
          </Tip>
          <TROUBLE>
            <QA
              q="It says 'Invalid login credentials'"
              a="Your password or email has a typo. Check three things: (1) the email is spelled perfectly, (2) Caps Lock is not on, (3) there is no extra space at the end (tap the backspace key a few times after typing). Then try again slowly."
            />
            <QA
              q="I forgot my password"
              a="Click the 'Forgot your password?' link under the sign-in box, type your email, and a reset link will be emailed to you. Click that link, then choose a new password. If that doesn't arrive, phone your wonderful loving son — this is a two-minute fix."
            />
            <QA
              q="I signed in but it says 'Admins only' or shows the regular shop"
              a="Your account needs admin permission switched on. This is a job for your wonderful loving son — one phone call, done in a minute. Do not keep retrying; it is not a typo problem. And yes, he was expecting this call."
            />
            <QA
              q="The page keeps asking me to sign in over and over"
              a="Your browser is forgetting you. At the top-right of your browser window, look for the ⋮ (three dots) or ☰ menu, choose History, then Clear browsing data → Cookies. Then sign in fresh. Or simply try a different browser (Chrome instead of Safari)."
            />
          </TROUBLE>
        </div>

        {/* ============ GETTING AROUND ============ */}
        <div id="getting-around">
          <H>2. Getting around the admin area</H>
          <P>
            Once signed in, look at the <strong>left side</strong> of the screen (on a
            phone, they are across the top). You will see a list of pages — like tabs in
            a binder:
          </P>
          <UList>
            <LI><strong>Overview</strong> — the front page. A summary of everything.</LI>
            <LI><strong>Products</strong> — the jewellery you sell.</LI>
            <LI><strong>Collections</strong> — groups of jewellery, like &ldquo;Winter&rdquo;.</LI>
            <LI><strong>Inventory</strong> — how many of each piece you have left.</LI>
            <LI><strong>Orders</strong> — what customers bought.</LI>
            <LI><strong>Customers</strong> — who has an account.</LI>
            <LI><strong>Mailing list</strong> — who signed up for emails (the pop-up).</LI>
            <LI><strong>Personalization</strong> — custom-order requests.</LI>
            <LI><strong>Content</strong> — text blocks on the website.</LI>
            <LI><strong>Discounts</strong> — coupon codes.</LI>
            <LI><strong>Analytics</strong> — the Numbers page (sales totals).</LI>
          </UList>
          <P>
            To go somewhere, <strong>click its name</strong>. To go back, use the same
            list. To leave the admin area entirely, click <strong>Sign out</strong> at
            the top right. Always sign out if you are using a shared computer.
          </P>
          <Tip>
            At the bottom of that list there is a special button with a little book on
            it: <strong>📖 How-to guide</strong>. That is THIS guide. If you are ever
            lost while working in the admin, click it and you are right back here.
          </Tip>
          <Tip>
            One more trick for finding your way: the <strong>Loving Charmz logo</strong>{' '}
            (the little LC square in the <strong>top left corner</strong>) always takes
            you back to the shop&rsquo;s main home page. Click it any time you feel
            lost — home is always one click away, and you can start over from there.
            Still stuck after that? Phone your wonderful loving son — he loves this
            stuff, and he never minds. (Really. He means it. Pepper this guide with
            that phone number.)
          </Tip>
          <Warn>
            Never close the browser tab in the middle of typing something long. Finish
            and press <strong>Save</strong> first. (If it happens anyway — see chapter
            16, &ldquo;When things go wrong&rdquo;.)
          </Warn>
          <Tip>
            The text can look small. Make it bigger: hold <strong>Ctrl</strong> and tap
            the <strong>+</strong> key. Too big? Ctrl and <strong>−</strong>. This works
            on every website, everywhere, and cannot break anything.
          </Tip>
        </div>

        {/* ============ MORNING ============ */}
        <div id="morning">
          <H>3. Your morning routine (5 minutes, with coffee)</H>
          <P>
            If you only ever learn one chapter of this guide, learn this one. This is
            your daily check-up.
          </P>
          <OList>
            <Step n="1">
              Sign in and click the purple <strong>Admin dashboard</strong> button
              (chapter 1 shows you how). You land on <strong>Overview</strong>.
            </Step>
            <Step n="2">
              Look at <strong>Action items</strong> in the middle of the page. This box
              tells you what needs doing today — like new orders waiting, or custom
              requests. If it says &ldquo;All caught up&rdquo;, wonderful, you are done.
            </Step>
            <Step n="3">
              If there <em>are</em> new orders, click <strong>Orders</strong> in the
              left-hand list. New orders are at the top. Follow chapter 4 for what to
              do with each one.
            </Step>
            <Step n="4">
              Click <strong>Personalization</strong>. If a customer asked for an
              engraving or custom piece, it shows here. Follow chapter 11.
            </Step>
            <Step n="5">
              Glance at <strong>Inventory</strong>. If anything shows <strong>0</strong>
              in stock, it cannot be bought — customers see &ldquo;sold out&rdquo;.
              Follow chapter 8 when you have made or received more.
            </Step>
          </OList>
          <P>
            That is it. Five minutes, coffee still warm. Everything else in this guide
            is only for when you <em>want</em> to change something. And on the days the
            website seems to be speaking a foreign language: coffee first, then your
            wonderful loving son.
          </P>
          <Ex>
            Monday morning: sign in → Overview says &ldquo;2 new orders, 1 custom
            request&rdquo; → Orders: two bracelets bought, both say &ldquo;paid&rdquo;
            → you will mail them today and press <strong>Shipped</strong> (chapter 4)
            → Personalization: one engraving request, reply to the customer by email
            (chapter 11) → done.
          </Ex>
        </div>

        {/* ============ ORDERS ============ */}
        <div id="orders">
          <H>4. Orders: what they are and what to do with them</H>
          <P>
            When a customer buys something, the order appears in{' '}
            <strong>Orders</strong> automatically. You never type an order in — the
            website does it for you. Your job is only to <em>keep the status fresh</em>.
          </P>
          <H3>Understanding the status badges</H3>
          <UList>
            <LI><strong>Paid</strong> — money received. This is your cue to make/pack the piece.</LI>
            <LI><strong>Processing</strong> — you are working on it (you set this yourself).</LI>
            <LI><strong>Shipped</strong> — you mailed it. Set this the day you mail it.</LI>
            <LI><strong>Delivered</strong> — it arrived. Optional, but nice book-keeping.</LI>
            <LI><strong>Cancelled</strong> — for cancelled orders only.</LI>
          </UList>
          <H3>Marking an order as shipped</H3>
          <OList>
            <Step n="1">Click <strong>Orders</strong> in the left-hand list.</Step>
            <Step n="2">
              Find the order in the list. Not sure which is which? Click the small{' '}
              <strong>Details</strong> arrow/word on a row to see what is inside it —
              the customer&rsquo;s name, what they bought, and the mailing address.
            </Step>
            <Step n="3">
              On the same row, find the <strong>status dropdown</strong> (a small box
              that says &ldquo;Paid&rdquo; or &ldquo;Processing&rdquo;). Click it.
            </Step>
            <Step n="4">
              Click <strong>Shipped</strong> in the list that appears. Done. The change
              saves by itself.
            </Step>
          </OList>
          <Tip>
            A customer can see their own order status when they sign in. Marking{' '}
            <strong>Shipped</strong> is the modern version of a handshake — it tells
            them it is on its way.
          </Tip>
          <TROUBLE>
            <QA
              q="The order says 'Awaiting payment'"
              a="The customer started paying but the payment did not finish (they may have closed the window, or the card was declined). Give it a few hours. If it is still awaiting payment the next day, contact the customer and suggest they try again — you do NOT need to do anything technical."
            />
            <QA
              q="I marked the wrong status by mistake"
              a="No harm done. Click the same dropdown again and pick the right one. Statuses can be changed as many times as needed."
            />
            <QA
              q="The customer says they paid but the order says Awaiting payment"
              a="Check the total. Sometimes the payment is still settling overnight. If it is still wrong after 24 hours, phone your wonderful loving son with the order number."
            />
          </TROUBLE>
        </div>

        {/* ============ PRODUCTS ============ */}
        <div id="products">
          <H>5. Adding a new product (a new piece of jewellery)</H>
          <P>
            This is the longest chapter — do it once together with your wonderful loving son, and the
            second time you will fly. Everything you type here appears on the public
            shop immediately after you press <strong>Create product</strong>.
          </P>
          <OList>
            <Step n="1">
              Click <strong>Products</strong> in the left-hand list, then click{' '}
              <strong>Add product</strong> (top right of the page).
            </Step>
            <Step n="2">
              <strong>Name</strong> — the piece&rsquo;s name, exactly as you want
              customers to see it. Example: <em>Aurora Pendant</em>.
            </Step>
            <Step n="3">
              <strong>Slug</strong> — leave this alone. It fills itself in from the
              name. (It is the web address ending, like <em>aurora-pendant</em>. If you
              ever see two products with the same slug, the website will warn you.)
            </Step>
            <Step n="4">
              <strong>Price</strong> — a number with a decimal, like <em>165.00</em>.
              Type digits and the dot only — no dollar sign. This is the price for the
              base version (brass). The metal and size choices adjust the price
              themselves on the product page.
            </Step>
            <Step n="5">
              <strong>Tagline</strong> — optional. A short sweet phrase shown as a
              little badge, like <em>Handcrafted in Alberta</em>.
            </Step>
            <Step n="6">
              <strong>Description</strong> — a few friendly sentences about the piece:
              what it is made of, how it feels, who it suits. Write like you are
              talking to one customer, not writing an ad.
            </Step>
            <Step n="7">
              <strong>Picture</strong> — see chapter 6 below. The short version: click
              the picture box, choose the photo from your computer, wait for the little
              preview to appear.
            </Step>
            <Step n="8">
              Leave both checkboxes <strong>Active</strong> (ticked) so customers can
              see and buy it. Only untick <strong>Personalizable</strong> if you will
              NOT take engraving requests for this piece.
            </Step>
            <Step n="9">
              Take a breath and re-read what you typed. Then press{' '}
              <strong>Create product</strong>.
            </Step>
            <Step n="10">
              Now give it stock: click <strong>Inventory</strong> in the left list and
              follow chapter 8. A product with no stock looks &ldquo;sold out&rdquo; to
              customers.
            </Step>
          </OList>
          <Tip>
            The homepage numbers take care of themselves: the &ldquo;Three collections ·
            Eight pieces&rdquo; line and &ldquo;Starting at $&rdquo; price update
            automatically from what you add. No editing those anywhere.
          </Tip>
          <Tip>
            This chapter feels long because it is your first one. By your third
            product you will not need it at all — and your wonderful loving son will
            be genuinely, slightly disappointed not to hear from you.
          </Tip>
          <TROUBLE>
            <QA
              q="It says 'Slug already exists'"
              a="Two products are trying to use the same web address. Change the Name slightly (add a colour or version word) and the slug will follow — or edit the slug by adding a number, like aurora-pendant-2."
            />
            <QA
              q="I pressed Create and nothing seemed to happen"
              a="Look for red text near the top of the form — that is the website telling you what is missing (usually the Name or Price). Fill it in and press Create again. Nothing is lost; everything you typed is still on the form."
            />
            <QA
              q="The product is live but I spelt something wrong"
              a="Products → find it → click Edit → fix the words → press Save changes. The shop updates right away."
            />
            <QA
              q="I want to take a product off the shop but not delete it"
              a="Products → find it → Edit → UNTICK the Active checkbox → Save. Customers can no longer see it. Tick it again any time to bring it back. Deleting is forever — hiding is not."
            />
          </TROUBLE>
        </div>

        {/* ============ PICTURES ============ */}
        <div id="pictures">
          <H>6. Pictures: uploading from your computer</H>
          <P>
            Every picture on the site comes from a file on your computer. The website
            never asks you to paste a web link — if you ever see a box asking for a
            &ldquo;URL&rdquo;, it is old instructions; tell your wonderful loving son.
          </P>
          <OList>
            <Step n="1">
              In the form, find the picture box (it says something like{' '}
              <strong>Click to upload</strong> or <strong>Drag &amp; drop</strong>).
            </Step>
            <Step n="2">
              <strong>Click the box.</strong> A window opens showing the files on your
              computer.
            </Step>
            <Step n="3">
              Find your photo (tip: photos you took are usually in the{' '}
              <strong>Pictures</strong> or <strong>Photos</strong> folder) and
              double-click it. On a phone or tablet, choose &ldquo;Photo Library&rdquo;
              instead.
            </Step>
            <Step n="4">
              Watch the box: a small preview of your photo appears, and a spinning
              circle while it uploads. <strong>Wait until the spinner stops.</strong>
            </Step>
            <Step n="5">
              Then press <strong>Save</strong> on the form (products, collections) — the
              picture is only truly attached after saving.
            </Step>
          </OList>
          <Warn>
            Pictures must be one of these types: <strong>JPG, PNG, or WebP</strong>, and
            smaller than <strong>5 MB</strong>. Phone photos are fine. If it refuses,
            the file is probably a HEIC (iPhone setting) or a PDF — see troubleshooting
            below.
          </Warn>
          <TROUBLE>
            <QA
              q="My iPhone photo will not upload"
              a="iPhone photos are often in a format called HEIC. Fix it on the phone: Settings → Camera → Formats → choose 'Most Compatible'. New photos will be JPG. (Photos already taken can be emailed to yourself and re-saved, or ask your wonderful loving son to convert them.)"
            />
            <QA
              q="It says 'File too large'"
              a="The picture is bigger than 5 MB. On Windows: right-click the photo → Open with → Paint → File → Save As → JPEG (Paint shrinks it). On Mac: open it in Preview → Tools → Adjust Size → make the width 1500 → save."
            />
            <QA
              q="The picture uploaded but looks sideways or upside-down"
              a="This is the photo's saved direction. On your computer, right-click the file → Open with → Photos → use the rotate button → save. Then upload it again. Replacing a picture automatically removes the old one."
            />
            <QA
              q="I uploaded the wrong picture"
              a="Just upload the right one over it — click the picture box again and choose the new file. The old one is replaced automatically, no double pictures."
            />
          </TROUBLE>
        </div>

        {/* ============ COLLECTIONS ============ */}
        <div id="collections">
          <H>7. Collections (grouping pieces together)</H>
          <P>
            A collection is a shelf in your shop — like &ldquo;Cuffs&rdquo; or
            &ldquo;Mother&rsquo;s Day&rdquo;. Customers see collections as pages on the
            website.
          </P>
          <OList>
            <Step n="1">Click <strong>Collections</strong> in the left-hand list.</Step>
            <Step n="2">Click <strong>New collection</strong> (top right).</Step>
            <Step n="3">
              <strong>Name</strong> — what customers will read, like{' '}
              <em>Heirloom Cuffs</em>. The <strong>Slug</strong> fills itself in.
            </Step>
            <Step n="4">
              <strong>Description</strong> — one or two sentences about what ties these
              pieces together.
            </Step>
            <Step n="5">
              <strong>Picture</strong> — upload from your computer, same as chapter 6.
            </Step>
            <Step n="6">
              <strong>Sort order</strong> — a number that decides the order on the
              website. Smaller numbers come first. If you want it second, type 2. All
              zeroes? The website just orders them alphabetically.
            </Step>
            <Step n="7">
              Leave <strong>Active</strong> ticked so customers can see it. Press{' '}
              <strong>Create collection</strong>.
            </Step>
          </OList>
          <H3>Putting products into a collection</H3>
          <OList>
            <Step n="1">Open <strong>Products</strong> and click <strong>Edit</strong> on a piece.</Step>
            <Step n="2">
              Find the <strong>Collections</strong> checkboxes (or dropdown) in the
              form and tick the collection(s) this piece belongs in.
            </Step>
            <Step n="3">Press <strong>Save changes</strong>.</Step>
          </OList>
          <Tip>
            One product can be in several collections at once — a cuff can be in both
            &ldquo;Cuffs&rdquo; and &ldquo;Gifts under $200&rdquo;. Nothing gets
            duplicated; it is like a book living on two shelves.
          </Tip>
          <Tip>
            Not sure a collection is set up right? Look at the public collections page
            (click Collections in the menu bar at the top of the shop). Still looks
            odd? Your wonderful loving son can see exactly what you see — describe it
            to him and he will spot it.
          </Tip>
        </div>

        {/* ============ INVENTORY ============ */}
        <div id="inventory">
          <H>8. Stock (inventory): the numbers behind each piece</H>
          <P>
            Every product is sold in up to six versions: <strong>brass or stainless
            steel</strong>, and <strong>small, medium, or large</strong>. Each version
            has its own stock count. When a customer buys one, the website subtracts it
            automatically — you only ever touch this page when you{' '}
            <em>make, receive, or fix</em> stock.
          </P>
          <OList>
            <Step n="1">Click <strong>Inventory</strong> in the left-hand list.</Step>
            <Step n="2">
              You will see one row per version, showing the piece&rsquo;s name, the
              version, and a <strong>Stock</strong> box with the current number.
            </Step>
            <Step n="3">
              Click inside the Stock box, type the new number, then{' '}
              <strong>click anywhere outside the box</strong> (that is what saves it —
              there is no Save button on this page; it saves the moment you click
              away).
            </Step>
            <Step n="4">
              If the version you need does not exist yet, use the{' '}
              <strong>Add version to product</strong> dropdown at the top: pick the
              product, then fill in Name (like <em>Brass / Large</em>), the stock
              number, and press <strong>Create variant</strong>.
            </Step>
          </OList>
          <H3>What the numbers mean to customers</H3>
          <UList>
            <LI>
              <strong>Stock 1 or more</strong> — customers can buy it. When it hits 0,
              the website shows &ldquo;sold out&rdquo; for that version automatically.
            </LI>
            <LI>
              <strong>A version with no row at all</strong> — the website does not
              offer it. If a size or metal is missing from a product, add the version
              here (step 4) and it appears on the product page instantly.
            </LI>
          </UList>
          <Ex>
            You finished 5 large brass cuffs of the Aurora Pendant: Inventory → find
            &ldquo;Aurora Pendant / Brass / Large&rdquo; → click the stock box → type 5
            → click outside the box. Customers can now buy up to 5 of them.
          </Ex>
          <TROUBLE>
            <QA
              q="I typed the stock number but it did not save"
              a="The save happens when you click OUTSIDE the box — not while typing. Click the number, change it, then click on any empty grey area of the page. If you reload the page and the old number is still there, it truly did not save — phone your wonderful loving son with the product name."
            />
            <QA
              q="A customer bought something and the number went down by itself"
              a="That is the system working perfectly. You never add stock for sales — only for making/receiving more."
            />
            <QA
              q="I need to offer a new size or metal that isn't listed"
              a="Inventory → 'Add version to product' → pick the product → name it exactly like the others (for example 'Brass / XL') → set the stock → Create. It appears on the product page right away. Ask your wonderful loving son before inventing brand-new option names for the first time, so the shop stays consistent."
            />
          </TROUBLE>
        </div>

        {/* ============ MAILING LIST ============ */}
        <div id="mailing-list">
          <H>9. The mailing list (who signed up for emails)</H>
          <P>
            When someone types their email into the welcome pop-up on the shop, their
            address is saved automatically. You can look at the list any time, and
            download it to send an email blast or keep it safe.
          </P>
          <OList>
            <Step n="1">Click <strong>Mailing list</strong> in the left-hand list.</Step>
            <Step n="2">
              The page shows the total number of signups and every email, newest first,
              with the date they signed up.
            </Step>
            <Step n="3">
              <strong>To download the list:</strong> click <strong>Download CSV</strong>{' '}
              (opens in Excel) or <strong>Download TXT</strong> (a plain list, one email
              per line). The file lands in your <strong>Downloads</strong> folder,
              named like <em>loving-charmz-emails-2026-09-15.csv</em>.
            </Step>
            <Step n="4">
              <strong>To search:</strong> type part of an email into the search box —
              the list shrinks as you type. Downloading after searching downloads only
              the ones you can see.
            </Step>
            <Step n="5">
              <strong>To remove someone</strong> (they asked to be unsubscribed): click{' '}
              <strong>Remove</strong> on their row, then confirm. This is the one place
              besides products where deletion is instant — make sure it is the right
              row.
            </Step>
          </OList>
          <Tip>
            Send yourself a test: download the CSV now and double-click it — if Excel
            opens it with the emails in one column, you have mastered it. Go and tell
            your wonderful loving son; he will be proud.
          </Tip>
          <TROUBLE>
            <QA
              q="The same email appears twice"
              a="Almost impossible — the system blocks duplicates. If you see a near-twin, it is probably two different spellings (a capital letter or a different provider). Remove the one the customer does not use."
            />
            <QA
              q="Someone says they signed up but they are not on the list"
              a="Ask them the exact email they typed. Search for it. If it is truly missing, they likely closed the pop-up before pressing the button — ask them to sign up again. There is nothing to fix on your side."
            />
            <QA
              q="I downloaded the file but cannot find it"
              a="Look in your Downloads folder (Windows: File Explorer → Downloads; Mac: Finder → Downloads). Or press Ctrl+J in the browser — that opens the download list, and you can click the file there."
            />
          </TROUBLE>
        </div>

        {/* ============ DISCOUNTS ============ */}
        <div id="discounts">
          <H>10. Discount codes (coupons)</H>
          <P>
            A discount code is a secret word customers type at checkout to get money
            off — like <strong>WELCOME10</strong>, which takes 10% off.
          </P>
          <OList>
            <Step n="1">Click <strong>Discounts</strong> in the left-hand list.</Step>
            <Step n="2">Click <strong>Create code</strong> (top right).</Step>
            <Step n="3">
              <strong>Code</strong> — the word customers will type. All capitals, no
              spaces. Example: <em>MOM25</em>.
            </Step>
            <Step n="4">
              <strong>Type</strong> — choose <strong>Percentage</strong> for % off, or{' '}
              <strong>Fixed</strong> for a dollar amount off.
            </Step>
            <Step n="5">
              <strong>Value</strong> — the size of the discount: 25 means 25% off (if
              Percentage) or $25.00 off (if Fixed).
            </Step>
            <Step n="6">
              <strong>Minimum order</strong> — optional. &ldquo;50&rdquo; means the
              code only works on orders of $50 or more.
            </Step>
            <Step n="7">
              <strong>Max uses</strong> — optional. Leave empty for unlimited. Put 50
              if you only want it usable 50 times.
            </Step>
            <Step n="8">
              Keep <strong>Active</strong> ticked, press <strong>Create</strong>, and
              the code works immediately at checkout.
            </Step>
          </OList>
          <Ex>
            A weekend promo: code <em>SPRING15</em>, type Percentage, value 15, minimum
            order 75. Tell customers: &ldquo;Spend $75+, type SPRING15 at checkout, get
            15% off.&rdquo; On Monday, Edit the code and untick Active — it stops
            working instantly.
          </Ex>
          <Tip>
            A code that is not working is almost always one of the four checks below.
            Work through them slowly with a cup of tea, and if all four look right,
            your wonderful loving son will want to hear the code word exactly as you
            told it to the customer.
          </Tip>
          <TROUBLE>
            <QA
              q="A customer says their code doesn't work"
              a="Check four things in Discounts: (1) Is Active ticked? (2) Is the spelling what you told them (spaces matter)? (3) Is their order at least the Minimum order amount? (4) Has Max uses run out (see the uses counter on the code)? Nine times out of ten it is one of these."
            />
            <QA
              q="I want to stop a code without deleting it"
              a="Edit the code and untick Active. The code is kept for the history but stops working. Tick it again any time."
            />
          </TROUBLE>
        </div>

        {/* ============ CUSTOM ORDERS ============ */}
        <div id="custom-orders">
          <H>11. Custom orders (engraving and personal requests)</H>
          <P>
            When a customer asks for something one-of-a-kind, their request appears in{' '}
            <strong>Personalization</strong> — including any photo they attached.
          </P>
          <OList>
            <Step n="1">Click <strong>Personalization</strong> in the left-hand list.</Step>
            <Step n="2">
              Each card shows the customer, what they asked for, and the reference
              photo if they added one.
            </Step>
            <Step n="3">
              Reply to the customer by email (their address is on the request) to talk
              price and timing.
            </Step>
            <Step n="4">
              As you work, use the <strong>status</strong> on the request — from
              &ldquo;new&rdquo; through &ldquo;in progress&rdquo; to
              &ldquo;done&rdquo; — so the Overview page stays honest.
            </Step>
          </OList>
          <Tip>
            You do not create anything here; you respond and keep the status current.
            Think of it as a corkboard of incoming notes.
          </Tip>
          <Tip>
            Custom requests are conversations, not orders — there is no payment to
            chase here and nothing you can break. If a customer asks something you
            are not sure how to answer (pricing an unusual engraving, for example),
            it is perfectly fine to reply &ldquo;Let me check and get back to you
            tomorrow&rdquo; — and then ask your wonderful loving son.
          </Tip>
        </div>

        {/* ============ CUSTOMERS ============ */}
        <div id="customers">
          <H>12. Customers</H>
          <P>
            This is the list of everyone with a shop account: their name and email.
            Use it to look someone up if they phone with a question about an order.
          </P>
          <UList>
            <LI>Click <strong>Customers</strong> in the left-hand list.</LI>
            <LI>Use the search box to find someone by name or email.</LI>
            <LI>
              You cannot and should not delete customers here. If someone asks to be
              removed from the shop entirely, that is a job for your wonderful loving son.
            </LI>
          </UList>
        </div>

        {/* ============ CONTENT BLOCKS ============ */}
        <div id="content">
          <H>13. Content blocks (words on the website)</H>
          <P>
            Certain word blocks on the site — like homepage sections — are stored as
            &ldquo;content blocks&rdquo; so you can edit them without touching code.
          </P>
          <OList>
            <Step n="1">Click <strong>Content</strong> in the left-hand list.</Step>
            <Step n="2">
              Each block has a <strong>name</strong> telling you where it shows. Click{' '}
              <strong>Edit</strong> on the one you want.
            </Step>
            <Step n="3">
              Change the words. Keep the tone warm and simple. Press{' '}
              <strong>Save</strong>, then visit the public page to see your change.
            </Step>
          </OList>
          <Warn>
            Change <strong>one block at a time</strong> and look at the website after
            each save. If you edit five blocks in a row, you will not know which change
            you liked.
          </Warn>
          <Tip>
            Saved a change and the page did not update? Hold Ctrl and tap R to refresh
            — computers show old copies sometimes. Still unchanged after a refresh?
            Un-tick and re-tick nothing, touch nothing else — just ring your wonderful
            loving son and tell him which block it was.
          </Tip>
        </div>

        {/* ============ WEBSITE PAGES ============ */}
        <div id="collections-page">
          <H>14. The website&rsquo;s pages (a map)</H>
          <P>
            For when a customer asks &ldquo;where do I find…&rdquo; — here is what
            lives at each web address. You do not edit these; they maintain themselves.
          </P>
          <UList>
            <LI><strong>/shop</strong> — every product for sale.</LI>
            <LI><strong>/collections</strong> — the collection shelves.</LI>
            <LI><strong>/about</strong>, <strong>/stories</strong> — the brand story.</LI>
            <LI><strong>/custom-orders</strong> — where custom requests come from.</LI>
            <LI><strong>/faq</strong> — answers to common questions.</LI>
            <LI><strong>/shipping</strong>, <strong>/refunds</strong> — the small print.</LI>
            <LI><strong>/wholesale</strong> — for bulk buyers.</LI>
            <LI><strong>/guide</strong> — this guide!</LI>
          </UList>
        </div>

        {/* ============ NUMBERS ============ */}
        <div id="numbers">
          <H>15. The Numbers page (analytics)</H>
          <P>
            Click <strong>Analytics</strong> to see how the shop is doing: money taken,
            number of orders, and which pieces sell best. It is read-only — there is
            nothing to press, nothing to break. Just look and enjoy.
          </P>
          <Tip>
            This is also the page to screenshot and send to your wonderful loving son
            when you want to show off. Strong sales weeks deserve a phone call too.
          </Tip>
          <Tip>
            &ldquo;Revenue&rdquo; counts paid orders. If a number looks low, remember
            awaiting-payment orders do not count yet.
          </Tip>
        </div>

        {/* ============ STUCK ============ */}
        <div id="stuck">
          <H>16. When things go wrong</H>
          <P>
            Print this chapter. Ninety percent of scares end in the first two lines
            below.
          </P>
          <TROUBLE>
            <QA
              q="I clicked something and now the page looks strange"
              a="Nothing is saved until you press a Save button. Click 'Overview' in the left-hand list to start fresh. If the whole screen looks odd, hold Ctrl and tap R to refresh the page."
            />
            <QA
              q="I was typing and the page went blank / my internet blipped"
              a="Sign back in and open the same page again. Anything you had SAVED is safe. Anything you had typed but not saved is gone — retype it. That is why this guide says: save often, especially before walking away."
            />
            <QA
              q="I deleted something I should not have"
              a="Phone your wonderful loving son immediately and say exactly what was deleted and when. Some things (like stock numbers) are quick to re-type; the sooner we know, the more can be recovered. Do not feel bad about it — it has happened to him too."
            />
            <QA
              q="The website itself looks broken to customers"
              a="First check on your phone using mobile data (not your wifi) — loving-charmz.vercel.app. If it works there, the problem is your computer or wifi, not the shop. If it fails everywhere, phone your wonderful loving son with what you see."
            />
            <QA
              q="Everything is slow / buttons do nothing when I click"
              a="Three steps: (1) Ctrl+R to refresh. (2) Close the browser completely and reopen it. (3) Restart the computer. Old computers just get tired — this fixes it more often than not."
            />
            <QA
              q="A green/purple message says 'Successfully saved' — did it work?"
              a="Yes. That message is the website confirming your change is live. If you want to double-check, open the public page in a new tab and look."
            />
          </TROUBLE>
          <H3>Words you will see, translated</H3>
          <UList>
            <LI><strong>Product</strong> — a piece of jewellery you sell.</LI>
            <LI><strong>Variant</strong> — a version of a piece (a metal/size combination).</LI>
            <LI><strong>Active</strong> — visible to customers. Unticked = hidden.</LI>
            <LI><strong>Slug</strong> — the web-address ending of a page. Leave it alone.</LI>
            <LI><strong>CSV</strong> — a file type that opens in Excel/Numbers.</LI>
            <LI><strong>Cache / clear cache</strong> — old copies of pages stored on your computer. When in doubt: Ctrl+R.</LI>
            <LI><strong>404 / Page not found</strong> — the address is misspelled or the page moved. Check the spelling first.</LI>
          </UList>
        </div>

        {/* ============ EMERGENCY CARD ============ */}
        <div id="emergency">
          <H>Emergency card (cut out and keep by the phone)</H>
          <div className="surface-card p-6 my-4 space-y-4 text-ink-800">
            <p className="font-display text-xl font-semibold text-plum-900">
              Loving Charmz — quick reference
            </p>
            <UList>
              <LI>
                <strong>Getting to the admin:</strong> loving-charmz.vercel.app →
                ACCOUNT (top right) → My account → the purple{' '}
                <strong>Admin dashboard</strong> button
              </LI>
              <LI>
                <strong>This guide:</strong> loving-charmz.vercel.app/guide
              </LI>
              <LI>
                <strong>Forgotten password?</strong> Click &ldquo;Forgot your
                password?&rdquo; on the sign-in page and follow the email.
              </LI>
              <LI>
                <strong>New order today?</strong> Orders → change status to Shipped
                after you mail it.
              </LI>
              <LI>
                <strong>Made more stock?</strong> Inventory → click the number → type
                the new one → click outside the box.
              </LI>
              <LI>
                <strong>Need the email list?</strong> Mailing list → Download CSV.
              </LI>
              <LI>
                <strong>Screen acting strange?</strong> Ctrl+R first. Then Overview.
                Then the phone.
              </LI>
            </UList>
          </div>
          <P>
            And the most important line in this whole guide:{' '}
            <strong>when in doubt, do nothing and phone your wonderful loving son.</strong> The shop
            can wait an hour. That is what he is for — and he loves you. He says so
            himself, right in this guide, where everyone can read it.
          </P>
          <div className="h-16" />
        </div>
      </div>
    </Container>
  );
}
