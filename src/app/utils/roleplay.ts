import { ColorResolvable, EmbedBuilder } from 'discord.js';

// Interface for API endpoints and their customizations
interface ActionEndpoint {
  apiUrl: string;
  color: ColorResolvable;
  selfMessage: string;
  botMessage: string;
  actionFormat: string;
  errorMessage: string;
}

// Map of action endpoints - some of these may use different APIs if nekos.life doesn't have them
export const actionEndpoints: Record<string, ActionEndpoint> = {
  'hug': {
    apiUrl: 'https://nekos.life/api/v2/img/hug',
    color: '#FFB6C1',
    selfMessage: "U-um... you can't really hug yourself >.<\nM-maybe ask someone else for a hug?",
    botMessage: "Eep! T-thank you for the thought, but I'm just a bot! *blushes* M-maybe try hugging someone else? ^^",
    actionFormat: "{user} gives {target} a warm hug~ *blushes*",
    errorMessage: "Oh n-no! I couldn't send the hug >.<\nS-something went wrong... I'm sorry!"
  },
  'kiss': {
    apiUrl: 'https://nekos.life/api/v2/img/kiss',
    color: '#FF69B4',
    selfMessage: "U-um... k-kissing yourself? That's n-not really possible >.<\nM-maybe find someone else to kiss?",
    botMessage: "Eep! *blushes profusely* I-I'm just a bot! T-that's very sweet though... maybe try someone else? ^^;",
    actionFormat: "{user} gives {target} a gentle kiss~ *blushes*",
    errorMessage: "Oh n-no! I couldn't send the kiss >.<\nS-something went wrong... I'm sorry!"
  },
  'pat': {
    apiUrl: 'https://nekos.life/api/v2/img/pat',
    color: '#9370DB',
    selfMessage: "U-um... patting yourself is a bit hard, don't you think? >.<\nM-maybe someone else can pat you!",
    botMessage: "*blushes* T-thank you for wanting to pat me! That's really sweet... but I'm just a bot ^^;",
    actionFormat: "{user} gently pats {target} on the head~ *shy smile*",
    errorMessage: "A-ah! I couldn't send the pat >.<\nS-something went wrong... sorry about that!"
  },
  'cuddle': {
    apiUrl: 'https://nekos.life/api/v2/img/cuddle',
    color: '#DA70D6',
    selfMessage: "U-um... cuddling yourself might be a bit lonely >.<\nM-maybe find someone else to cuddle with?",
    botMessage: "*blushes deeply* E-eep! That's v-very sweet, but I'm just a bot! ^^; Maybe cuddle a friend instead?",
    actionFormat: "{user} cuddles with {target} all warm and cozy~ *shy smile*",
    errorMessage: "Oh n-no! I couldn't send the cuddle >.<\nS-something went wrong... I'm sorry!"
  },
  'slap': {
    apiUrl: 'https://nekos.life/api/v2/img/slap',
    color: '#FF6347',
    selfMessage: "U-um... why would you want to slap yourself? >.<\nP-please don't hurt yourself!",
    botMessage: "*flinches* Eek! W-what did I do wrong? >.< P-please don't slap me...",
    actionFormat: "{user} slaps {target}! *hides behind hands* O-oh my!",
    errorMessage: "A-ah! I couldn't send the slap >.<\nS-something went wrong... sorry about that!"
  },
  'poke': {
    apiUrl: 'https://nekos.life/api/v2/img/poke',
    color: '#87CEEB',
    selfMessage: "U-um... you're trying to poke yourself? >.<\nThat's a bit s-silly, don't you think?",
    botMessage: "Eep! *jumps slightly* Y-you startled me! ^^; I-I'm just a bot though...",
    actionFormat: "{user} pokes {target} gently~ *peeks shyly*",
    errorMessage: "O-oh! I couldn't send the poke >.<\nS-something went wrong... I'm sorry!"
  },
  'bite': {
    apiUrl: 'https://api.waifu.pics/sfw/bite',
    color: '#FF4500',
    selfMessage: "B-biting yourself? That seems painful! >.<\nP-please don't hurt yourself!",
    botMessage: "*squeaks in fear* E-eep! Please d-don't bite me! I'm just a bot! ^^;",
    actionFormat: "{user} gently bites {target}~ *peeks nervously*",
    errorMessage: "O-oh! I couldn't send the bite >.<\nS-something went wrong... I'm sorry!"
  },
  'boop': {
    apiUrl: 'https://api.waifu.pics/sfw/poke',
    color: '#00CED1',
    selfMessage: "U-um... booping your own nose? T-that's kinda cute actually! >.<\nB-but maybe boop someone else?",
    botMessage: "*blinks in surprise* E-eep! You booped me? *blushes* T-that's cute but I'm just a bot ^^;",
    actionFormat: "{user} boops {target} on the nose~ *giggles shyly*",
    errorMessage: "A-ah! I couldn't send the boop >.<\nS-something went wrong... sorry about that!"
  },
  'highfive': {
    apiUrl: 'https://api.waifu.pics/sfw/highfive',
    color: '#32CD32',
    selfMessage: "H-high fiving yourself? T-that's a bit lonely >.<\nM-maybe find a friend to high five?",
    botMessage: "*shyly raises hand* I-I'd high five you if I could! B-but I'm just a bot... ^^;",
    actionFormat: "{user} gives {target} an enthusiastic high five~ *shy smile*",
    errorMessage: "O-oh! I couldn't send the high five >.<\nS-something went wrong... I'm sorry!"
  },
  'handholding': {
    apiUrl: 'https://api.waifu.pics/sfw/handhold',
    color: '#FF69B4',
    selfMessage: "H-holding your own hand? That's a bit s-sad >.<\nM-maybe someone else would like to hold your hand?",
    botMessage: "*blushes deeply* H-h-handholding?! T-that's so forward! >///<\nI-I'm just a bot though...",
    actionFormat: "{user} holds {target}'s hand gently~ *blushes deeply*",
    errorMessage: "A-ah! I couldn't send the handholding >.<\nS-something went wrong... sorry about that!"
  },
  'tickle': {
    apiUrl: 'https://nekos.life/api/v2/img/tickle',
    color: '#FFA500',
    selfMessage: "T-tickling yourself? D-does that even work? >.<\nM-maybe tickle someone else?",
    botMessage: "*giggles nervously* E-eep! I-I'm not ticklish, I'm just a bot! ^^;",
    actionFormat: "{user} tickles {target} playfully~ *giggles shyly*",
    errorMessage: "O-oh! I couldn't send the tickle >.<\nS-something went wrong... I'm sorry!"
  },
  'wave': {
    apiUrl: 'https://api.waifu.pics/sfw/wave',
    color: '#4169E1',
    selfMessage: "W-waving at yourself? T-that's a bit weird >.<\nM-maybe wave at someone else?",
    botMessage: "*waves back shyly* H-hello there! ^^",
    actionFormat: "{user} waves at {target}~ *smiles shyly*",
    errorMessage: "A-ah! I couldn't send the wave >.<\nS-something went wrong... sorry about that!"
  },
  'bully': {
    apiUrl: 'https://api.waifu.pics/sfw/bully',
    color: '#8B0000',
    selfMessage: "B-bullying yourself? That's not very nice >.<\nP-please be kind to yourself!",
    botMessage: "*looks sad* W-what did I do wrong? P-please don't bully me... >.<",
    actionFormat: "{user} bullies {target} a little~ *looks concerned*",
    errorMessage: "A-ah! I couldn't send the bully >.<\nS-something went wrong... sorry about that!"
  },
  'kill': {
    apiUrl: 'https://api.waifu.pics/sfw/kick',
    color: '#800000',
    selfMessage: "K-killing yourself?! N-no! Please don't even joke about that! >.<",
    botMessage: "*cowers in fear* E-eep! P-please don't hurt me! I-I'm just trying to help! >.<",
    actionFormat: "{user} pretends to defeat {target} in a game~ *looks worried*",
    errorMessage: "O-oh! I couldn't send that >.<\nS-something went wrong... maybe that's for the best..."
  },
  'snuggle': {
    apiUrl: 'https://api.waifu.pics/sfw/cuddle',
    color: '#FF69B4',
    selfMessage: "S-snuggling with yourself might be a bit lonely >.<\nM-maybe find someone else to snuggle with?",
    botMessage: "*blushes deeply* E-eep! That's v-very sweet, but I'm just a bot! ^^;",
    actionFormat: "{user} snuggles close to {target}~ *blushes shyly*",
    errorMessage: "Oh n-no! I couldn't send the snuggle >.<\nS-something went wrong... I'm sorry!"
  },
  'greet': {
    apiUrl: 'https://api.waifu.pics/sfw/wave',
    color: '#4682B4',
    selfMessage: "G-greeting yourself? T-that's a bit strange >.<\nM-maybe greet someone else?",
    botMessage: "*bows shyly* H-hello there! It's n-nice to meet you! ^^",
    actionFormat: "{user} greets {target} warmly~ *smiles shyly*",
    errorMessage: "A-ah! I couldn't send the greeting >.<\nS-something went wrong... sorry about that!"
  },
  'punch': {
    apiUrl: 'https://api.waifu.pics/sfw/kick',
    color: '#B22222',
    selfMessage: "P-punching yourself?! Please don't hurt yourself! >.<",
    botMessage: "*cowers in fear* E-eep! What did I do wrong?! P-please don't punch me! >.<",
    actionFormat: "{user} playfully punches {target}'s arm~ *looks nervous*",
    errorMessage: "O-oh! I couldn't send the punch >.<\nM-maybe that's for the best..."
  },
  'lick': {
    apiUrl: 'https://api.waifu.pics/sfw/lick',
    color: '#BA55D3',
    selfMessage: "L-licking yourself? T-that's a bit weird >.<\nC-cats do that, but people?",
    botMessage: "*blushes profusely* E-EEP! T-that's... t-that's so forward! >///<\nI-I'm just a bot!",
    actionFormat: "{user} gives {target} a little lick~ *blushes deeply*",
    errorMessage: "A-ah! I couldn't send the lick >.<\nS-something went wrong... sorry about that!"
  },
  'nom': {
    apiUrl: 'https://api.waifu.pics/sfw/bite',
    color: '#FF8C00',
    selfMessage: "N-nomming on yourself? A-are you hungry? >.<\nM-maybe get a snack instead!",
    botMessage: "*squeaks* E-eep! Please d-don't eat me! I'm just a bot! ^^;",
    actionFormat: "{user} noms on {target} playfully~ *blushes*",
    errorMessage: "O-oh! I couldn't send the nom >.<\nS-something went wrong... I'm sorry!"
  },
  'stare': {
    apiUrl: 'https://api.waifu.pics/sfw/stare',
    color: '#483D8B',
    selfMessage: "S-staring at yourself? Do you n-need a mirror? >.<",
    botMessage: "*fidgets nervously* U-um... why are you staring at me like that? >.<\nD-did I do something wrong?",
    actionFormat: "{user} stares intently at {target}~ *peeks shyly*",
    errorMessage: "A-ah! I couldn't send the stare >.<\nS-something went wrong... sorry about that!"
  },
  'hold': {
    apiUrl: 'https://api.waifu.pics/sfw/handhold',
    color: '#FF69B4',
    selfMessage: "H-holding yourself? Are you okay? >.<\nM-maybe you need a hug from someone?",
    botMessage: "*blushes deeply* E-eep! That's v-very sweet, but I'm just a bot! ^^;",
    actionFormat: "{user} holds {target} close~ *blushes*",
    errorMessage: "Oh n-no! I couldn't send that >.<\nS-something went wrong... I'm sorry!"
  },
  'pats': {
    apiUrl: 'https://nekos.life/api/v2/img/pat',
    color: '#9370DB',
    selfMessage: "U-um... patting yourself is a bit hard, don't you think? >.<\nM-maybe someone else can pat you!",
    botMessage: "*blushes* T-thank you for wanting to pat me! That's really sweet... but I'm just a bot ^^;",
    actionFormat: "{user} gives {target} lots of pats~ *shy smile*",
    errorMessage: "A-ah! I couldn't send the pats >.<\nS-something went wrong... sorry about that!"
  }
};

// Function to fetch image from API
export async function fetchActionImage(actionType: string): Promise<string> {
  const endpoint = actionEndpoints[actionType];
  if (!endpoint) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  const response = await fetch(endpoint.apiUrl);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // Different APIs have different response formats
  return data.url || data.image;
}

// Create embed for the action
export function createActionEmbed(
  actionType: string,
  user: any,
  target: any
): EmbedBuilder {
  const endpoint = actionEndpoints[actionType];
  if (!endpoint) {
    throw new Error(`Unknown action type: ${actionType}`);
  }

  const description = endpoint.actionFormat
    .replace('{user}', user)
    .replace('{target}', target);

  return new EmbedBuilder()
    .setColor(endpoint.color)
    .setDescription(description);
} 