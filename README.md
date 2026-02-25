# ✧ Constellation

**An atlas of agents for intentional software development.**

---

Constellation is a framework for developers who care about craft. It coordinates AI agents through a shared environment—like stars leaving trails across the night sky for others to follow.

You describe what you want to build. The stars refine it, plan it, build it, test it, and ship it. You stay in control. The AI does the heavy lifting.

No copy-pasting between chat windows. No context lost between sessions. No AI making decisions you didn't ask for.

Just clear intent in, working software out.

---

## Why Constellation?

Most AI coding tools work like this: you prompt, it generates, you hope it's right.

Constellation works differently:

1. **Ideas get refined before code gets written.** Vega (the ideation star) keeps asking questions until there's zero ambiguity. No guessing.

2. **Plans get made before building starts.** Cassiopeia (the architecture star) breaks work into clear tasks with dependencies. No improvisation.

3. **Testing is independent from building.** Aldebaran (the testing star) never sees implementation details. It tests against intent. No "tests that pass because they were written to pass."

4. **Everything leaves a trail.** Every decision, every question, every answer—recorded. You can see exactly how your software came to be.

The result: software built with intention, not accident.

---

## Quick Start

### Prerequisites


### Install

Navigate to your project and run:

```bash
curl -fsSL https://raw.githubusercontent.com/jcbbge/constellation/main/install.sh | bash
```

That's it. One command.

### Your First Trajectory

---

## How It Works

### The Four Houses

Development flows through four phases, called **houses**:

| House | Phase | What Happens |
|-------|-------|--------------|
| **Dawn** | Ideation | Raw ideas become validated intent with clear success criteria |
| **Meridian** | Planning | Intent becomes architecture, architecture becomes tasks |
| **Descent** | Implementation | Tasks become code |
| **Night** | Testing & Integration | Code gets verified and shipped |

You move through houses as work progresses. Each house has different stars at zenith (active), twilight (advisory), or below the horizon (dormant).

### The Six Stars

Each star is an OpenCode agent with a specific role:

| Star | Role | Active In |
|------|------|-----------|
| **Vega** | Ideation — refines raw concepts into clear intent | Dawn |
| **Polaris** | Arbiter — routes questions, approves exceptions | Always |
| **Cassiopeia** | Architecture — designs systems, breaks down tasks | Meridian |
| **Sirius** | Implementation — writes the code | Descent |
| **Aldebaran** | Testing — verifies the work | Night |
| **Orion** | Integration — designs test specifications | Night |

Stars coordinate by leaving **trails** in a shared database. No direct communication. Pure stigmergy—like ants leaving pheromones, but for code.

### Invoking Stars in OpenCode

### The Core Protocol

Every star follows the same discipline:

1. **Observe** — Survey the sky for relevant trails
2. **Understand** — Ensure zero questions remain (nQ=0)
3. **Act** — Do the work
4. **Trail** — Leave clear traces for others

If a star has questions, it asks. If it can't get answers after 3-4 attempts, it escalates to Polaris. If Polaris can't resolve it, you get notified.

The goal: front-load all clarity so execution is smooth. No mid-flight improvisation.

---

## Project Structure


---

## Customizing Your Sky

### Adding a Star

# YOUR STAR NAME

You are **Your Star**, the star of [domain].

## Your Work

[Describe what this star does, how it reads trails, what it produces]

## Your Protocol

[The discipline this star follows]

---

## The Vocabulary

Constellation uses celestial language throughout. Here's the glossary:

| Term | Meaning |
|------|---------|
| **House** | A phase of development (Dawn, Meridian, Descent, Night) |
| **Star** | An AI agent with a specific role |
| **Zenith** | Star is fully active in current house |
| **Twilight** | Star is available for questions only |
| **Below Horizon** | Star is dormant, cannot be invoked |
| **Trajectory** | A path of work from idea to shipped software |
| **Trail** | A trace left by a star for others to observe |
| **Orbit** | One work cycle on a trajectory |
| **Nova** | Successful completion |
| **Eclipse** | Blockage or failure |
| **nQ=0** | "No questions remain" — clarity achieved |

---

## Philosophy

### On AI Partnership

Constellation treats AI as a collaborator, not a servant. You bring the vision. The stars bring the execution capacity. Together, you build things neither could alone.

This isn't about replacing developers. It's about amplifying them.

### On Intentional Development

The software industry is drowning in AI-generated slop—code that works but nobody understands, features that exist but nobody wanted, complexity that grew but nobody planned.

Constellation is a deliberate counter to that. Every piece of software that passes through has:
- Clear intent (validated by Vega)
- Thoughtful architecture (designed by Cassiopeia)
- Clean implementation (built by Sirius)
- Verified behavior (tested by Aldebaran)
- Successful deployment (shipped by Orion)

And a complete trail showing how it got there.

### On Craft

Some developers just want to ship. That's valid.

Constellation is for developers who want to ship *and* understand what they shipped. Who care about the how, not just the what. Who see code as craft, not just output.

If that's you, welcome. Chart your first trajectory.

---

## Contributing

Constellation is open source because good tools should be shared.

**Ways to contribute:**

- **New stars** — Domain-specific agents for your field
- **Better prompts** — Refine how stars communicate and reason
- **Documentation** — Help others understand and use the system
- **Bug fixes** — Make the sky more stable

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License. Use it, modify it, ship with it.

---

<p align="center">
  <i>Look up. The stars are waiting.</i>
</p>
