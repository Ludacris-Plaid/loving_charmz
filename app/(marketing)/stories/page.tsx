import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { images } from '@/lib/images';

export const metadata = {
  title: 'Stories — Loving Charmz',
  description: 'Illustrative stories from our community of keepsake-wearers.',
};

type Story = {
  slug: string;
  image: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  date: string;
  attribution: string;
};

const stories: Story[] = [
  {
    slug: 'a-daughters-tribute',
    image: images.pets.dogPortrait,
    title: 'A Daughter’s Tribute',
    subtitle: 'How a small pendant helped Sarah keep her companion, Luna, close every day.',
    excerpt: 'When Luna passed, Sarah found an unexpected way to carry twelve years of love forward.',
    content: `The morning everything changed started like any other. Sarah woke to the soft weight of Luna’s head on her pillow — that familiar feeling she had woken to for twelve years. But this morning was different. Luna’s breathing was shallow, her eyes tired but peaceful.

“It’s time, isn’t it?” Sarah whispered, her voice breaking. Luna’s tail wagged once, weakly, as if to say yes.

The days that followed were the hardest Sarah had ever faced. The house felt empty in a way that physical space could not explain. Luna’s bed sat in the corner, her toys still scattered across the living room, her water bowl by the kitchen door. Every corner held a memory.

A month later, Sarah came across Loving Charmz while scrolling through social media. A pendant caught her eye — a golden paw print surrounded by a delicate heart, with a small inscription space inside. She knew immediately what she wanted.

“Every time I look at it,” Sarah told us, “I feel her presence. It is not about replacing the void — nothing could do that. It is about carrying her with me, wherever I go.”

The pendant became her daily companion. She wore it to work, to the grocery store, on those long evening walks she still took — now alone, but accompanied by the weight of gold around her neck.`,
    date: 'Illustrative · 2024',
    attribution: 'Composite story based on customer notes',
  },
  {
    slug: 'fifteen-years-of-loyalty',
    image: images.pets.goldenRetriever,
    title: 'Fifteen Years of Loyalty',
    subtitle: 'Mark found comfort in a custom piece honoring his faithful companion of fifteen years.',
    excerpt: 'Max had been with Mark since before his wedding, before his children, before everything.',
    content: `Mark still remembers the day he brought Max home — a scrappy golden retriever puppy with ears too big for his head and eyes that seemed to say: you picked me, and I will never leave your side.

He was twenty-three, fresh out of college, living in a one-bedroom apartment. Max slept at the foot of his bed, paws twitching as he dreamed of squirrels. They walked together every evening, two young souls figuring out life side by side.

Twelve years passed. Mark got married. Max was there, tail wagging, at the wedding. The kids came — Lily, then James — and Max became their gentle protector, tolerating endless games of dress-up with the patience of a saint.

When Max was fourteen, the vet delivered the news no pet parent wants to hear. The kindest thing to do was let him go.

“The hardest part,” Mark told us, “was explaining to the kids. Lily was eight, old enough to understand but young enough that the grief hit her in waves.”

Mark ordered a custom pendant — a golden retriever silhouette with engraved leaves and a date range on the back. “It sounds silly to some people,” he said. “Spending money on jewelry for a dog. But Max was not just a dog. He was there for every milestone of our family.”`,
    date: 'Illustrative · 2024',
    attribution: 'Composite story based on customer notes',
  },
  {
    slug: 'first-love',
    image: images.pets.sleepingCat,
    title: 'First Love',
    subtitle: 'A girl’s first kitten inspired a keepsake that now symbolizes unconditional love.',
    excerpt: 'For Emma, getting a kitten named Coco was the beginning of learning to love something more than yourself.',
    content: `Emma was six when she found the kitten behind the family garage. She was tiny — barely a handful of gray fur with eyes like two full moons. From the moment Emma held her, Coco chose her.

“She picked me,” Emma says now, at twelve. “I didn’t pick her. She picked me.”

For six years, they were inseparable. Coco slept on Emma’s bed, curled against her back like a living heating pad. When Emma started middle school and the homework got harder, Coco would sit on her desk, watching, as if offering moral support.

When Coco got sick, Emma understood enough to know it was bad.

“I remember thinking,” Emma recalls, “that I would give anything to make her better. I’d give all my allowance. All my birthday money. Everything.”

Coco crossed the rainbow bridge on a quiet Tuesday morning, with Emma and her parents beside her. The charm Emma chose — a small sleeping cat curled into a perfect circle, with tiny crystals embedded in the shape of tears — sits on her bracelet today.

“Coco was my first,” Emma says. “She taught me that love isn’t about not losing things. It’s about having them while you can and holding them close. Even when they’re gone, they’re not really gone. They’re in here.”`,
    date: 'Illustrative · 2024',
    attribution: 'Composite story based on customer notes',
  },
  {
    slug: 'two-hearts-one-bond',
    image: images.pets.puppy,
    title: 'Two Hearts, One Bond',
    subtitle: 'A matching set became the symbol of a connection that transcends words.',
    excerpt: 'When the family dog crossed the rainbow bridge, two sisters reached for the same thing.',
    content: `Identical twins Maya and Leah had always done everything together. Same schools, same friends, same inside jokes. When their parents brought home a golden doodle they named Biscuit, the girls thought he was the best surprise ever.

For ten years, Biscuit divided his time between the twins’ bedrooms, equally devoted to both but with a soft spot for Maya — she was the one who usually shared her cereal in the morning.

Then came college. Different states. Different lives. The twins talked every week, but something was different now. Then Maya got the call. Biscuit was sick. Very sick.

She drove nine hours through the night to get home. Leah caught the first flight. They both made it, just in time.

They held Biscuit as he crossed the rainbow bridge, the three of them together — two sisters who had shared everything since the womb, and their dog who had shared their lives since they were eight.

After, Maya and Leah sat in their childhood living room. Then they did something they had done a thousand times before — they reached for each other’s hands.

They chose matching bracelets with two small hearts that fit together perfectly, like puzzle pieces. One for Maya, one for Leah.

“Wearing it makes me think of him,” Maya says. “But it also makes me think of her. Of us. How no matter how far apart we are, we have this thing that connects us.”`,
    date: 'Illustrative · 2024',
    attribution: 'Composite story based on customer notes',
  },
  {
    slug: 'beyond-the-fur',
    image: images.pets.cat,
    title: 'Beyond the Fur',
    subtitle: 'For David, his cat Oliver became an unlikely anchor during the darkest chapter of his life.',
    excerpt: 'A cat no one wanted became the one thing that kept David going.',
    content: `David did not want a cat. His ex-girlfriend’s cat, actually — Oliver had been hers, and when they broke up, David figured the cat would stay with her. But Oliver had other plans.

For five years, Oliver was David at his worst and David at his best. When David lost his job, Oliver was there, purring, a warm weight that did not care about bank accounts. When the depression hit — and it hit hard — Oliver was there too, forcing David to get out of bed to feed him, to open the door so he could sit in the window, to keep living because something needed him.

“Oliver saved my life,” David says now. “I had nothing. No job, no money, no hope. And this little guy just chose me. Every day, he chose me.”

When Oliver got sick, David was ready. He took time off work. He learned everything he could about kidney disease in cats. He bought special food, gave subcutaneous fluids, did everything possible.

It was not enough.

A pendant shaped like a cat silhouette, with a small star embedded in the forehead, sits on David’s dresser today. He calls it his reminder.

“Love doesn’t end just because they do,” David says. “It just changes shape. And you carry it with you, forever.”`,
    date: 'Illustrative · 2024',
    attribution: 'Composite story based on customer notes',
  },
  {
    slug: 'the-forever-puppy',
    image: images.pets.beagle,
    title: 'The Forever Puppy',
    subtitle: 'After seventeen years, Daisy taught Linda that some bonds never break.',
    excerpt: 'When Linda brought Daisy home as a young divorcee, the beagle helped her learn to love again.',
    content: `When Linda brought Daisy home — a floppy-eared beagle puppy — she was thirty-two, recently divorced, and convinced she would never love anything again. The world had taught her that people left. They promised forever and then they left.

Daisy had other ideas about whose favorite she was.

For seventeen years, Daisy made it her mission to prove Linda wrong. She greeted her every evening like she had been waiting for hours. She slept on Linda’s feet, a warm weight that said: I am here, I am staying. She waited by the door when Linda came home from work, her entire body wagging with joy that never dimmed.

The vet called it a good, long life. Seventeen years was remarkable for a beagle. But to Linda, it still felt too soon.

Linda found Loving Charmz on what would have been Daisy’s fifteenth gotcha day. She ordered a pendant — two small paw prints, one slightly larger than the other, connected by a delicate chain. The larger print was for Daisy. The smaller was for the new rescue puppy Linda had been considering.

That next weekend, Linda adopted a three-month-old beagle mix. She named her Daisy Jr. — though they called her DJ.

“Daisy would have wanted this,” Linda reflects. “She would have loved DJ. And honestly? I think she’s glad I’m not alone anymore.”`,
    date: 'Illustrative · 2024',
    attribution: 'Composite story based on customer notes',
  },
];

export default function StoriesPage() {
  return (
    <Container className="py-12 sm:py-16">
      <ScrollReveal>
        <div className="text-center mb-12">
          <span className="badge-mint">Community stories</span>
          <h1 className="section-title font-display text-4xl sm:text-5xl font-semibold text-plum-900 mt-4">
            Stories that touch the heart
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-ink-600">
            Composite stories inspired by the people who wear Loving Charmz — names and details changed to protect their privacy.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story, index) => (
          <ScrollReveal key={story.slug} delay={Math.min(index * 90, 450)}>
            <Link
              href={`/stories/${story.slug}`}
              className="group block surface-card inner-highlight overflow-hidden hover-lift"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={story.image}
                  alt={story.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover motion-base group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <span className="text-xs text-ink-500">{story.date}</span>
                <h2 className="font-display text-xl font-semibold text-plum-900 mt-1 mb-2 group-hover:text-plum-700 motion-base">
                  {story.title}
                </h2>
                <p className="text-sm text-ink-600 mb-3">{story.excerpt}</p>
                <span className="text-sm font-medium text-plum-700">Read more →</span>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={150}>
        <div className="mt-12 surface-card inner-highlight p-8 sm:p-10 text-center max-w-2xl mx-auto">
          <h2 className="font-display text-2xl font-semibold text-plum-900">Share your story</h2>
          <p className="mt-2 text-ink-600">
            With your permission, we would love to feature your keepsake story in our community collection.
          </p>
          <a href="mailto:hello@lovingcharmz.com" className="btn-outline mt-6 px-6 py-2.5 text-sm">
            Get in touch
          </a>
        </div>
      </ScrollReveal>
    </Container>
  );
}

export { stories };
