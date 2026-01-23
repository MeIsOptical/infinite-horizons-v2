<h1>Infinite Horizons</h1>
<p>Infinite Horizons uses LLMs to enable players to generate and explore limitless 2D environments. Whether you're crafting serene landscapes or dense cities, the possibilities are endless. But the creativity doesn't stop at world-generating; the AI dynamically generates quests as you play, creating a living story that never ends.</p>
<br>
<div>
  <h2>Planned Features</h2> 
  <ul>
    <li>AI-Powered World Generation</li>
    <li>Never-Ending Quest System</li>
  </ul>
</div>
<br>
<div>
  <h2>Structure</h2>
  <ul>
    <li><b>/scripts</b> - Core Game Logic</li>
    <ul>
      <li><code>main.js</code>: Main entry point</li>
      <li><code>game.js</code>: Controls the game loop</li>
      <li><code>state.js</code>: Holds state objects</li>
      <li><code>worldgen.js</code>: Procedural world generation</li>
      <li><code>player.js</code>: Player state, camera, and inputs</li>
      <li><code>visuals.js</code>: Renders in-game elements</li>
      <li><code>entities.js</code>: Entity movement and friction</li>
      <li><code>physics.js</code>: Hitbox-based collision detection</li>
      <li><code>storage.js</code>: Local storage using IndexedDB</li>
    </ul>
    <br>
    <li><b>/auth</b> - Authentication</li>
    <ul>
      <li><code>auth.js</code>: API interface and JWT management</li>
    </ul>
    <br>
    <li><b>/assets</b> - Assets</li>
    <ul>
      <li><code>assets.json</code>: Contains arrays of all available assets</li>
      <li><code>assets.js</code>: Dynamically loads assets from the manifest</li>
    </ul>
    <br>
    <li><b>/ai</b> - AI Generation Data</li>
    <ul>
      <li><code>expectedWorldStructure.json</code>: Schema defining the required format for world generation</li>
      <li><code>worldStructureExamples.json</code>: Example structures used for prompting the AI</li>
    </ul>
  </ul>
</div>
<div>
  <h2>Tech Stack</h2>
  <ul>
    <li><b>Frontend:</b></li>
    <ul>
      <li>HTML5</li>
      <li>JavaScript</li>
      <li>CSS</li>
    </ul>
    <br>
    <li><b>Backend:</b></li>
    <ul>
      <li>Cloudflare Worker</li>
    </ul>
    <br>
    <li><b>Database:</b></li>
    <ul>
      <li>Cloudflare D1 SQL Database</li>
    </ul>
    <br>
    <li><b>Local Storage:</b></li>
    <ul>
      <li>IndexedDB</li>
    </ul>
  </ul>
</div>