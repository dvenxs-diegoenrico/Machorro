"""
Generates the two "liquid screen" textures (caustic ripples) as SVG data URIs.

    python3 scripts/caustic.py   # writes caustic-light.svg / caustic-dark.svg here

Then URL-encode each SVG into --caustic-light-vec / --caustic-dark-vec in
styles/motion.css. They are used as masks on layers that only slide (composited),
so the filter is drawn once. Don't animate them by background-position: an SVG
filter repainted every frame costs seconds of main-thread time.
Tweak frequency / seed / table to change the look.
"""
SIZE = 480


def texture(fid, freq, seed, rgb, table):
    r, g, b = rgb
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}">'
        f'<filter id="{fid}" x="0" y="0" width="100%" height="100%">'
        f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="1" seed="{seed}" stitchTiles="stitch"/>'
        f'<feColorMatrix values="0 0 0 0 {r} 0 0 0 0 {g} 0 0 0 0 {b} 1.6 0 0 0 -0.3"/>'
        f'<feComponentTransfer><feFuncA type="table" tableValues="{table}"/></feComponentTransfer>'
        f'</filter><rect width="100%" height="100%" filter="url(#{fid})"/></svg>'
    )


# thin bright ripple lines: light through water
LIGHT = texture("l", "0.0085 0.011", 7, (1, 1, 1), "0 0 0 0.9 0 0 0 0 0.75 0 0 0 0 0.65 0 0")
# broad soft troughs: the darker shade
DARK = texture("d", "0.006 0.008", 21, (0.02, 0.12, 0.08), "0 0.6 0 0 0 0.55 0 0 0.5 0")

if __name__ == "__main__":
    for name, svg in (("light", LIGHT), ("dark", DARK)):
        with open(f"caustic-{name}.svg", "w") as f:
            f.write(svg)
        print(f"caustic-{name}.svg")
