import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export const metadata = {
  title: 'Stories - Loving Charmz',
  description: 'Heartwarming stories from our community.',
};

const stories = [
  {
    slug: 'a-mothers-tribute',
    emoji: '💝',
    title: "A Mother's Tribute",
    subtitle: 'How a simple pendant helped Sarah keep her beloved Luna close every day',
    excerpt: 'The bond between a mother and her dog transcends words. When Luna passed, Sarah found an unexpected way to keep her companion forever close.',
    content: `The morning everything changed started like any other. Sarah woke to the soft weight of Luna's head on her pillow—that familiar feeling she'd woken to for twelve years. But this morning was different. Luna's breathing was shallow, her eyes tired but peaceful.

"It's time, isn't it?" Sarah whispered, her voice breaking. Luna's tail wagged once, weakly, as if to say yes.

The days that followed were the hardest Sarah had ever faced. The house felt empty in a way that physical space couldn't explain. Luna's bed sat in the corner, her toys still scattered across the living room, her water bowl by the kitchen door. Every corner held a memory.

A month later, Sarah came across Loving Charmz while scrolling through social media. A pendant caught her eye—a golden paw print surrounded by a delicate heart, with a small inscription space inside. She knew immediately what she wanted.

"Every time I look at it," Sarah told us, "I feel her presence. It's not about replacing the void—nothing could do that. It's about carrying her with me, wherever I go."

The pendant became her daily companion. She wore it to work, to the grocery store, on those long evening walks she still took—now alone, but accompanied by the weight of gold around her neck.

"Sometimes I catch myself touching it without thinking," she shared. "And in that moment, I'm right back there with her. The way she'd lean against my leg. The way she'd wait by the door for me, like I'd been gone for years, not hours."

Luna had been more than a pet. She'd been Sarah's rock through her divorce, her companion during late nights studying for her master's degree, her reason to get up when getting up felt impossible. She was family.

"The pendant doesn't bring Luna back," Sarah said, tears in her eyes. "But it keeps her close. And some days, that's everything."`,
    date: 'March 2024',
    author: 'Sarah M.',
  },
  {
    slug: 'rainbow-bridge',
    emoji: '🌈',
    title: 'Rainbow Bridge',
    subtitle: "Mark found comfort in a custom piece honoring his faithful companion of 15 years",
    excerpt: 'Max had been with Mark since before his wedding, before his children, before everything. Losing him left a hole that no amount of time seemed to fill.',
    content: `Mark still remembers the day he brought Max home—a scrappy golden retriever puppy with ears too big for his head and eyes that seemed to say, "You picked me, and I'll never leave your side."

He was twenty-three, fresh out of college, living in a one-bedroom apartment. Max slept at the foot of his bed, paws twitching as he dreamed of squirrels. They walked together every evening, two young souls figuring out life side by side.

Twelve years passed. Mark got married. Max was there, tail wagging, at the wedding—literally part of the ceremony, walking down the aisle with the ring bearer. The kids came—Lily, then James—and Max became their gentle protector, tolerating endless games of dress-up and tea parties with the patience of a saint.

When Max was fourteen, the vet delivered the news no pet parent wants to hear. Cancer. The kindest thing to do was let him go.

"The hardest part," Mark told us, "was explaining to the kids. Lily was eight, old enough to understand but young enough that the grief hit her in waves. We'd be in the car, and she'd suddenly start crying. 'I miss Max.' And I'd hold her, and we'd cry together."

Mark wanted something to honor the dog who'd been his firstborn in every way that mattered. He ordered a custom pendant—a golden retriever silhouette surrounded by engraved leaves, with "Max 2009-2024" on the back.

"It sounds silly to some people," Mark admitted. "Spending money on jewelry for a dog. But Max wasn't just a dog. He was there when I was lonely. He was there when I brought my wife home. He was there when my kids took their first steps. He was there for every milestone of our family."

The pendant sits on Mark's desk now, visible during every video call, visible to his colleagues who ask about it. He tells them about Max—the good boy, the patient brother, the loyal friend who waited by the door every single day without fail.

"People say time heals," Mark reflected. "But I don't think that's quite right. Time teaches you to carry it differently. The pendant reminds me that grief is just love with nowhere to go—so I wear it, and I let that love have a place to rest."`,
    date: 'February 2024',
    author: 'Mark T.',
  },
  {
    slug: 'new-beginnings',
    emoji: '✨',
    title: 'New Beginnings',
    subtitle: "A young girl's first pet inspired a gift that now symbolizes unconditional love",
    excerpt: 'For Emma, getting a kitten named Coco was the beginning of learning what it means to love something more than yourself.',
    content: `Emma was six when she found the kitten behind the family garage. She was tiny—barely a handful of gray fur with eyes like two full moons. From the moment Emma held her, Coco chose her.

"She picked me," Emma says now, at twelve. "I didn't pick her. She picked me."

For six years, they were inseparable. Coco slept on Emma's bed, curled against her back like a living heating pad. When Emma started middle school and the homework got harder, Coco would sit on her desk, watching, as if offering moral support. When Emma's best friend moved away and the loneliness felt unbearable, Coco was there, purring, reminding her that she wasn't alone.

Then came the diagnosis. Coco was sick—something in her kidneys. The vet talked about treatments, about costs, about realistic expectations. Emma, eleven years old, understood enough to know it was bad.

"I remember thinking," Emma recalls, "that I would give anything to make her better. I'd give all my allowance. All my birthday money. Everything."

The treatments worked—for a while. But eventually, the kindest thing happened. Coco crossed the rainbow bridge on a quiet Tuesday morning, with Emma and her parents beside her.

Emma's grandmother, who had lost her own cat decades before, took her to find something to remember Coco by. That's when they found Loving Charmz.

Emma chose a small silver charm—a sleeping cat, curled into a perfect circle, with tiny crystals embedded in the shape of tears. It was small enough to fit on a bracelet, meaningful enough to carry Coco everywhere.

"I wear it every day," Emma says, pulling her sleeve back to show the bracelet. "Even when I'm at school. Even when I'm sleeping. Coco is always with me."

What strikes anyone who meets Emma is her wisdom beyond her years. She speaks about loss with a grace that seems impossible for someone so young.

"Mom says I'll have other pets someday," she says. "And I know that's true. But Coco was my first. She taught me that love isn't about not losing things. It's about having them while you can and holding them close. Even when they're gone, they're not really gone. They're in here." She touches her heart.

The charm has become a conversation starter among her friends. Some have lost pets too. Some haven't. But all of them understand something important after talking to Emma: love, once given, never disappears. It just finds new shapes to wear.

"I'm going to get another cat someday," Emma says, with a small smile. "And when I do, I'll tell them about Coco. Because that's what you do—you carry the ones you love with you, forever."`,
    date: 'January 2024',
    author: 'Emma R.',
  },
  {
    slug: 'forever-puppy',
    emoji: '🐕',
    title: 'The Forever Puppy',
    subtitle: 'After 17 years, Daisy taught Linda that some bonds never break',
    content: `When Linda brought Daisy home—a floppy-eared beagle puppy—she was thirty-two, recently divorced, and convinced she would never love anything again. The world had taught her that people left. They promised forever and then they left.

Daisy had other plans.

For seventeen years, Daisy made it her mission to prove Linda wrong. She greeted her every evening like she'd been waiting for hours (she probably had). She slept on Linda's feet, a warm weight that said "I'm here, I'm staying." She waited by the door when Linda came home from work, her entire body wagging with joy that never dimmed—not after a year, not after ten, not after seventeen.

The vet called it "a good, long life." Seventeen years was remarkable for a beagle. But to Linda, it still felt too soon.

The house was too quiet. The bed was too empty. The mornings were too still.

Linda found Loving Charmz on what would have been Daisy's fifteenth "gotcha day." She ordered a pendant—two small paw prints, one slightly larger than the other, connected by a delicate chain. The larger print was for Daisy. The smaller was for the new rescue puppy Linda had been considering.

"I wasn't sure I was ready," Linda admits. "But Daisy would have hated seeing me so sad. She always knew. She'd put her head on my lap and just... stay there. Like she was saying, 'It's okay. I'm still here.'"

That next weekend, Linda adopted a three-month-old beagle mix. She named her Daisy Jr.—though they called her DJ. The pendant now sits alongside a new charm, a tiny silver bone that DJ earned by being exactly what Linda needed: a reason to get up, a reason to walk, a reason to love again.

"Seventeen years," Linda says, touching the pendant. "That's more than some marriages. More than some friendships. Daisy was my person. She still is. The pendant reminds me that some bonds don't end. They just change form."

DJ bounces around her feet now, a ball of puppy energy that sometimes knocks over the furniture and always, always brings joy. She has Daisy's floppy ears. Maybe her heart too.

"Some people say it's weird to get a new dog so soon," Linda reflects. "But Daisy would have wanted this. She would have loved DJ. And honestly? I think she's glad I'm not alone anymore."`,
    date: 'April 2024',
    author: 'Linda K.',
  },
  {
    slug: 'two-hearts-one-bond',
    emoji: '💕',
    title: 'Two Hearts, One Bond',
    subtitle: 'A twinset became the symbol of a connection that transcends words',
    content: `Identical twins Maya and Leah had always done everything together. Same schools, same friends, same hair clips. When their parents brought home a golden doodle they'd named Biscuit, the girls thought he was the best surprise ever.

Biscuit had other ideas about whose favorite he was.

For ten years, Biscuit lived his best life dividing his time between the twins' bedrooms, equally devoted to both but with a soft spot for Maya—she was the one who usually shared her cereal in the morning.

Then came college. Different states. Different lives. The twins talked every week, but something was different now. The daily closeness was gone. The inside jokes were harder to find.

Then Maya got the call. Biscuit was sick. Very sick.

She drove nine hours through the night to get home. Leah caught the first flight. They both made it, just in time.

"The vet said we could stay with him," Maya remembers. "So we did. Both of us. We lay on the floor with him, both of us, like when we were kids and he'd jump on our bed."

They held Biscuit as he crossed the rainbow bridge, the three of them together—two sisters who had shared everything since the womb, and their golden doodle who had shared their lives since they were eight.

After, Maya and Leah sat in their childhood living room, crying. Then they did something they'd done a thousand times before—they reached for each other's hands.

"We knew we needed something," Leah explains. "Something to remember him. Something we could both wear, so even when we're apart, we're connected."

They found a pendant at Loving Charmz—two small hearts that fit together perfectly, like puzzle pieces. One for Maya, one for Leah. They bought matching bracelets too.

"Wearing it makes me think of him," Maya says. "But it also makes me think of her—of us. How no matter how far apart we are, we have this thing that connects us. Biscuit's memory, and the bond we share."

The twins graduated the same year. They moved to the same city. They got an apartment together—and adopted a new puppy, a golden retriever they named Cookie.

"Everything changes," Leah reflects. "But some things don't. We still share everything. We still reach for each other's hands. And now we share Cookie too." She laughs. "She definitely prefers Maya, though. Just like Biscuit."

The hearts sit on both their dresser tables now, side by side even when the sisters are apart. A reminder that some bonds—twin bonds, pet bonds, family bonds—are built to last forever.`,
    date: 'May 2024',
    author: 'Maya & Leah S.',
  },
  {
    slug: 'beyond-the-fur',
    emoji: '🌟',
    title: 'Beyond the Fur',
    subtitle: 'For David, his cat Oliver became an unlikely anchor during the darkest chapter of his life',
    content: `David didn't want a cat. His ex-girlfriend's cat, actually—Oliver had been hers, and when they broke up, David figured the cat would stay with her. But Oliver had other plans.

"She's not the one I want," Oliver seemed to say, curling up on David's lap that first night. "You're the one I want."

For five years, Oliver was David at his worst and David at his best. When David lost his job, Oliver was there, purring, a warm weight that didn't care about bank accounts. When the depression hit—and it hit hard—Oliver was there too, forcing David to get out of bed to feed him, to open the door so he could sit in the window, to keep living because something needed him.

"People don't believe me when I say a cat saved my life," David says. "But it's true. I had nothing. No job, no money, no hope. And this little guy just... chose me. Every day, he chose me."

When Oliver got sick—kidney failure, the vet said, common in older cats—David was ready. He took time off work. He learned everything he could about kidney disease in cats. He bought special food, gave subcutaneous fluids, did everything possible.

It wasn't enough.

"I was there," David says, his voice steady but heavy. "I held him. I told him he was the best cat in the world. I told him thank you. For everything."

After, David found himself in a pet store, looking at nothing in particular. That's when he saw it—a pendant shaped like a cat silhouette, with a small star embedded in the forehead. The description said it represented "guidance through darkness."

"I didn't know if I believed in that stuff," David admits. "But I believed in Oliver. And I wanted something to remember him by."

The pendant goes everywhere with David. To work, to the gym, to the coffee shop where he reads on Sunday mornings. It's become a conversation piece, and David has told Oliver's story more times than he can count.

"Sometimes people laugh," he says. "They think I'm being dramatic. A cat saved your life? But then I explain, and they get it. Pets aren't just pets. They're family. They're there for us in ways no one else can be."

David has since adopted another cat—a tiny black kitten he named Stardust. She has Oliver's green eyes.

"She has his spirit," David says. "Same bossy attitude. Same love of naps in sunbeams. I like to think Oliver sent her to me. That somewhere, he's still looking out for me."

The pendant catches the light sometimes, that little star glinting. David always smiles when he sees it.

"People ask me if it gets easier," he says. "Losing someone you love, pet or person. And I think... easier isn't the right word. But you learn to carry it. You learn that love doesn't end just because they do. It just changes shape. And you carry it with you, forever."`,
    date: 'June 2024',
    author: 'David L.',
  },
];

export default function StoriesPage() {
  return (
    <Container className="py-12">
      <div className="text-center mb-12">
        <span className="badge-gold inline-flex items-center">Community Stories</span>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-obsidian-50 mt-6 mb-4">
          Stories that touch the heart
        </h1>
        <p className="text-obsidian-400 max-w-xl mx-auto">
          Every piece of jewelry carries a story. Here we share the memories, 
          bonds, and love that inspire our community.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story, i) => (
          <Link
            key={story.slug}
            href={`/stories/${story.slug}`}
            className="surface-premium rounded-card p-6 border border-obsidian-700/50 hover-lift block"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="text-4xl mb-4">{story.emoji}</div>
            <span className="text-xs text-obsidian-500">{story.date}</span>
            <h2 className="font-display text-xl font-semibold text-obsidian-50 mb-2 mt-1">
              {story.title}
            </h2>
            <p className="text-obsidian-400 text-sm mb-3">{story.excerpt}</p>
            <span className="text-gold-500 text-sm font-medium">Read more →</span>
          </Link>
        ))}
      </div>

      <div className="text-center mt-12 surface-premium rounded-card p-8 border border-obsidian-700/50 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl font-semibold text-obsidian-50 mb-3">
          Share Your Story
        </h2>
        <p className="text-obsidian-400 mb-4">
          Have a story to share? We&apos;d love to hear how your keepsake carries your memories.
        </p>
        <a href="mailto:hello@lovingcharmz.com" className="btn-outline-gold px-6 py-2 rounded-pill text-sm font-semibold uppercase">
          Get in Touch
        </a>
      </div>
    </Container>
  );
}

export { stories };