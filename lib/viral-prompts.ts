export type ViralPromptSpec = {
  positive: string;
  negative: string;
  observed: boolean;
  source: string;
};

const sharedNegative = "identity drift, extra people, duplicate limbs, extra fingers, warped face, flicker, jitter, frame morphing, camera shake, text, watermark";

const observed: Record<string, ViralPromptSpec> = {
  "Earth Zoom": {
    positive: "Vertical 9:16 cinematic aerial descent from high above the clouds toward the uploaded subject's location, a smooth continuous zoom through atmosphere into a recognizable landscape and city grid, realistic scale and atmospheric haze, stable geography and natural motion blur.",
    negative: `${sharedNegative}, teleporting, cuts, abstract space, changing destination`, observed: true, source: "Higgsfield playable Earth Zoom sample"
  },
  "Cardboard Cutout": {
    positive: "Vertical 9:16 locked-off interior shot. Keep the original kitchen and floor unchanged while the uploaded person becomes a flat printed cardboard cutout; a second physical cutout of the same person slides or steps out beside the original, with rigid paper edges, shallow depth, and a playful stop-motion reveal.",
    negative: `${sharedNegative}, soft-body duplicate, liquid morph, background replacement, floating torso`, observed: true, source: "Higgsfield playable Cardboard Cutout sample"
  },
  "Float Spin": {
    positive: "Vertical 9:16 portrait on the original landscape background. Keep the subject centered and fully visible while they slowly rotate in place through a clean 360-degree turn, hair and clothing following believable inertia, sword and hands staying attached, camera mostly locked.",
    negative: `${sharedNegative}, walking, levitation jump, subject scale change, background spin`, observed: true, source: "Higgsfield playable Float Spin sample"
  },
  "Moonwalk": {
    positive: "Vertical 9:16 theatrical full-body shot. Preserve the staged blue curtain and hanging props while the subject performs a smooth backward moonwalk across the small planet set; replace the overhead star decoration with a slowly changing crescent moon and orbiting hanging planets, keeping feet planted and anatomy coherent.",
    negative: `${sharedNegative}, running forward, sliding feet detached, new location, hard cut`, observed: true, source: "Higgsfield playable Moonwalk sample"
  },
  "Sticker Peel": {
    positive: "Locked-off 9:16 full-body shot using the uploaded photo as an unchanged image plate. Opening beat: the entire person is intact, standing exactly where they are, with the original background and floor perfectly still. Match the reference motion: a large realistic manicured hand with a bright turquoise nail enters from the upper-right foreground and pinches the crown of the person's hair/head, never covering the face. The person is a flat printed 2D die-cut sticker adhered to the image plane. The hand physically peels the sticker downward from the crown, creating a crisp horizontal peel edge that travels across the shoulders and torso; the person's face, hair, clothing, pose, and proportions remain printed on one continuous flat sheet. The hand pulls the fully detached sticker toward the camera, briefly showing its pale white paper backside, then holds the front of the sticker up close. Keep the revealed background exactly unchanged and frozen. One continuous physical peel action, realistic fingers and sticker edge, vertical social video.",
    negative: "hand covering face, hand touching face only, no peel, no peel edge, no crown pinch, person remains attached, normal live-action person, subject walking away, subject shrinking, morphing, dissolving, melting, disintegration, duplicate person, partial body left floating, multiple hands, extra fingers, malformed fingers, 3D volumetric person, 3D paper sculpture, curled or folded sticker, sticker stuck to hand, camera movement, zoom, pan, cut, time lapse, moving background, changed background, parallax, background warp, background reconstruction, scene replacement, neon replacement background, altered face, altered clothing, flicker, jitter, text, watermark", observed: true, source: "Higgsfield playable Sticker Peel sample + Comfy dry-run comparison"
  },
  "Sketch to Fabric": {
    positive: "Vertical 9:16 locked-off beach portrait. Preserve the face, pose, shoreline, sunset, and tripod while the subject's plain garment transforms gradually from a simple sketch-like dress into richly colored embroidered fabric with visible seams, folds, beads, and realistic cloth texture.",
    negative: `${sharedNegative}, body redesign, face replacement, changing beach, camera move, garment melting`, observed: true, source: "Higgsfield playable Sketch to Fabric sample"
  },
  "Selfie Twin": {
    positive: "Vertical 9:16 street portrait with the original storefront, bicycle, lighting, and framing preserved. A visually identical twin of the uploaded person enters beside them, puts an arm around their shoulder, raises a phone, and takes a selfie; match clothing, face, scale, and shadows exactly.",
    negative: `${sharedNegative}, different outfit, face mismatch, extra twins, background replacement, phone deforming`, observed: true, source: "Higgsfield playable Selfie Twin sample"
  },
  "Orbit 360": {
    positive: "Vertical 9:16 full-body fashion shot. Keep the uploaded subject frozen in the same pose while the camera makes a smooth 360-degree orbit around them, with strong foreground/background parallax, consistent sunlight, sky, buildings, and object geometry; no subject deformation.",
    negative: `${sharedNegative}, subject walking, camera zoom, horizon bending, background replacement, changing pose`, observed: true, source: "Higgsfield playable Orbit 360 sample"
  }
};

const inferredActions: Record<string, string> = {
  "Fairytale Castle": "have a friend film the subject running through a dusk meadow; lift the camera to reveal a huge fairytale palace on the horizon as fireworks bloom above its towers",
  Elevate: "start with the uploaded subject lying in bed wearing headphones, slowly levitate them, then dissolve the cozy bedroom into a quiet star field while they hover weightless",
  "Action Figure": "have a hand lift the uploaded person from the scene as a rigid plastic action figure and rotate the unchanged pose for a toy-review showcase",
  "Mighty Fighter": "show a battle-worn knight walking alone through a foggy poppy field at dawn, dropping the helmet, then falling backward into the flowers to rest",
  "Blue Depth": "submerge the subject into deep blue water with drifting particles, caustic light, and slow underwater motion",
  "Orbital Presence": "place the subject in a convincing orbital environment with a slow weightless drift and a planet curving behind them",
  "Ice Statue": "freeze the subject progressively into a translucent ice statue with frost spreading over clothing and hair",
  "CGI Breakdown": "peel the scene into a clean CGI breakdown showing wireframe, clay render, lighting pass, and final render in sequence",
  "Drown in Music": "show a high-contrast black-and-white person putting on headphones and swaying with eyes closed while eight vibrant patterned backgrounds flicker behind them in a mixed-media zine rhythm",
  "Baseball Game": "frame the uploaded subject seated in baseball stadium stands in a team jersey, watching the field in a soft live-broadcast stargirl moment",
  "Drift Racing": "stage Tokyo night street racing with cars drifting and doing donuts around the uploaded character, low angles, 35mm film grain, and a blockbuster reveal",
  "Football Invader": "have an athletic football player burst into the original scene with a fast run and ball-carrying impact",
  "Summer Haze": "make a dreamy lomo-style home movie where a friend handheld-films the person across mountains, lake, and grass in six hazy pastel shots with light leaks and soft film grain",
  "Kung Fu Hit": "stage one dojo CGI strike that sends the character recoiling in slow motion, leaving solid energy copies before a final flash counter",
  "Final Serve": "show a mid-2000s tennis-final broadcast: the uploaded subject wins match point, reacts with raw exhaustion and emotion, then waves in close-up as the crowd erupts",
  "Android Assemble": "assemble the subject into a polished android from mechanical components, ending on a coherent finished robot",
  "3D Render": "show a clean 3D software reveal with the camera orbiting a hyper-detailed character model, fast zooms, rotating lights, and mouse-click UI",
  "Storm Giant": "open like a cinematic blockbuster: a colossal storm giant emerges from storm clouds and casually deflects a fighter jet with a finger snap, with anamorphic scale",
  "Zombie Dance": "animate the subject as a playful zombie performing a clear dance loop with controlled limbs and stable framing",
  "Golf Major": "stage a mid-2000s golf-major broadcast where a clean 200-yard iron shot drops straight into the hole, the crowd erupts, and the subject reacts with quiet disbelief",
  "2000s Paparazzi": "stage a retro VHS Y2K paparazzi clip where the subject exits a luxury hotel through a golden revolving door, passes flashing cameras, and enters a black car",
  "Candid Paparazzi": "stage a candid K-pop airport paparazzi clip where the subject in Y2K streetwear walks through the terminal while photographers follow and flash",
  "Race Track": "show a confident selfie walk on a sunlit race track while cars blast past at full speed; hair, clothes, camera, and shockwave motion respond coherently",
  Nightline: "render a retro polygonal cyberpunk noir character-select screen: the character in a glossy suit takes a boxing guard, then draws a knife in a dim sepia alley",
  "Free Fall": "send an android body into a cyberpunk skyscraper free fall while mechanical parts snap together mid-air with servo locks, violent wind, and a coherent finished character",
  "Red Carpet": "stage a red-carpet arrival with camera flashes, a confident step forward, and a brief pose for photographers",
  "Clay Figurine": "have two hands lift the uploaded person out of the photo as a small matte clay figurine, then knead and squash the figure like plasticine while every dent remains visible",
  "Neon City": "transition the original scene into a saturated neon city at night with glowing signs, wet reflections, and controlled parallax",
  "Soul Fighter": "transform the subject into a glowing soul fighter surrounded by energy trails before a single grounded combat pose",
  "Tuscan Yoga": "place the subject in a calm Tuscan landscape performing a slow balanced yoga pose in warm afternoon light",
  "Apex Hunter": "render a retro low-poly racing-game cover: the character rides a silver-white futuristic motorcycle down a night highway and accelerates into blue flames with chrome title/UI",
  "In the Dark": "drop the scene into near darkness and reveal the subject with a narrow moving beam of light and controlled silhouette",
  "Red Thread": "draw a vivid red thread from the subject through the scene, wrapping and connecting visual elements in one continuous motion",
  "Exit the Dream": "render a retro PS1 survival-horror game screen with a low-poly character in a haunted mansion, CRT scanlines, menu UI, and restrained idle motion",
  "Ending Fairy": "stage a K-pop ending-fairy broadcast: the subject holds a final dance pose, breathes softly, smiles into camera, and lets confetti fall slowly around them",
  "Dragon Fantasy": "bring a large fantasy dragon into the scene behind the subject with wing movement, atmospheric smoke, and a controlled reveal",
  "Fan Meeting": "stage a K-pop fansign close-up where the idol makes a cute bunny-heart gesture while talking to a fan whose face stays out of frame, with soft handheld zoom",
  "Night Vision": "render the shot as green monochrome night-vision footage with sensor grain, exposure shifts, and a cautious subject movement",
  "Office CCTV": "reframe the scene as a fixed overhead office security-camera clip with timestamp-like surveillance composition and one clear action",
  "Race Winner": "stage a cinematic night-race montage: a driver in a white suit exits a cockpit, climbs out, and lifts off the helmet in slow motion under stadium floodlights",
  "Casual Monster Slayer": "have an ordinary-looking subject casually defeat a much larger monster with one readable comedic action",
  Wrestle: "animate a short choreographed wrestling exchange with a grapple, controlled takedown, and stable anatomy",
  "Magic Spell": "have the subject cast one visible magic spell with hand gesture, glowing runes, particles, and a clear release",
  "Animal Chase": "stage a fast playful chase between the subject and an animal through the original environment with readable direction",
  "Earth Zoom Out": "pull the camera smoothly away from the subject and landscape until the city, coastline, atmosphere, and Earth scale are revealed",
  "Earth Zoom In": "push the camera continuously from a high Earth view down through clouds toward the subject's local landscape",
  "Arena Zero": "place the subject in a clean futuristic arena and stage one decisive combat beat with dramatic lights",
  "Superfast Flight": "send the subject through a high-speed aerial flight path with strong directional motion blur and stable identity",
  Disintegration: "break the subject apart from the edges into fine particles, then let the particles disperse while the background remains unchanged",
  "Sword and Sorcery": "give the subject a grounded sword-and-sorcery hero pose with a single sword movement and restrained magical effects",
  "Still World": "freeze the uploaded subject almost perfectly while the surrounding action continues moving around them with a restrained time-slice effect",
  "Face Punch": "animate a single punch traveling toward the camera with a readable wind-up, near-lens impact, and no facial distortion",
  "Animal Ride": "have the subject ride an animal through the scene with natural body balance, gait, and matched camera movement",
  "Me and Pet Transformation": "transform the subject and their pet together into a coordinated fantasy form while preserving both identities and relative positions"
};

// These 55 catalog entries have a playable Higgsfield MP4. Each was sampled at
// opening, middle, and closing frames; seven remaining cards are image-only.
const sampledVideoPresets = new Set([
  "Earth Zoom", "Float Spin", "Sticker Peel", "Selfie Twin", "Cardboard Cutout", "Moonwalk", "Sketch to Fabric", "Orbit 360", "Fairytale Castle", "Elevate", "Action Figure", "Mighty Fighter", "Blue Depth", "Orbital Presence", "Ice Statue", "CGI Breakdown", "Drown in Music", "Baseball Game", "Drift Racing", "Football Invader", "Summer Haze", "Kung Fu Hit", "Final Serve", "Android Assemble", "3D Render", "Storm Giant", "Zombie Dance", "Golf Major", "2000s Paparazzi", "Candid Paparazzi", "Race Track", "Nightline", "Free Fall", "Red Carpet", "Clay Figurine", "Neon City", "Soul Fighter", "Tuscan Yoga", "Apex Hunter", "In the Dark", "Red Thread", "Exit the Dream", "Ending Fairy", "Dragon Fantasy", "Fan Meeting", "Night Vision", "Office CCTV", "Race Winner", "Casual Monster Slayer", "Magic Spell", "Earth Zoom Out", "Arena Zero", "Disintegration", "Still World", "Animal Ride", "Orbital Presence"
]);

function inferred(name: string): ViralPromptSpec {
  const action = inferredActions[name] ?? `animate the uploaded subject with a polished ${name.toLowerCase()} effect`;
  const observedVideo = sampledVideoPresets.has(name);
  return { positive: `Vertical 9:16 social video. Preserve the uploaded subject's face, pose, lighting, and original scene. ${action}; keep anatomy, edges, and background coherent, with a stable camera unless the effect requires a deliberate move.`, negative: `${sharedNegative}, vague motion, unrelated props, background replacement, subject cropped, abrupt cuts`, observed: observedVideo, source: observedVideo ? "Higgsfield preview MP4 sampled at opening, middle, and closing frames" : "Higgsfield card has no playable preview MP4" };
}

export function promptForPreset(name: string): ViralPromptSpec { return observed[name] ?? inferred(name); }
