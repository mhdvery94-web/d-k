---
name: Structural Wireframe
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#44474c'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#75777d'
  outline-variant: '#c5c6cc'
  surface-tint: '#555f70'
  primary: '#212b3a'
  on-primary: '#ffffff'
  primary-container: '#374151'
  on-primary-container: '#a3adc0'
  inverse-primary: '#bdc7db'
  secondary: '#585f6a'
  on-secondary: '#ffffff'
  secondary-container: '#dce3f0'
  on-secondary-container: '#5e6570'
  tertiary: '#362811'
  on-tertiary: '#ffffff'
  tertiary-container: '#4e3e25'
  on-tertiary-container: '#c0a989'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e3f7'
  primary-fixed-dim: '#bdc7db'
  on-primary-fixed: '#121c2a'
  on-primary-fixed-variant: '#3d4757'
  secondary-fixed: '#dce3f0'
  secondary-fixed-dim: '#c0c7d3'
  on-secondary-fixed: '#151c25'
  on-secondary-fixed-variant: '#404752'
  tertiary-fixed: '#f8dfbc'
  tertiary-fixed-dim: '#dbc3a2'
  on-tertiary-fixed: '#261905'
  on-tertiary-fixed-variant: '#55442b'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system focuses on pure functional utility and structural clarity, serving as a high-fidelity wireframe framework. The brand personality is objective, neutral, and architecturally driven, intended to remove the distraction of color and high-fidelity aesthetics to focus on user flow and information hierarchy.

The design style is a strict **Minimalism** with a **Low-Contrast Outline** approach. It utilizes a grayscale palette to differentiate between surface levels and interactive states without implying final visual branding. Whitespace is used aggressively to define groupings and provide breathing room for content ideation.

## Colors
The palette is restricted to a grayscale spectrum to ensure focus remains on structure.
- **Primary**: Dark gray (#374151) is reserved for high-contrast text and active interactive states.
- **Secondary**: Medium-light gray (#9CA3AF) used for secondary text and icons.
- **Neutral/Surface**: Light gray (#F3F4F6) provides a subtle backing for container elements and input fields.
- **Background**: Pure white (#FFFFFF) is the base canvas.
- **Border**: A consistent gray (#D1D5DB) defines all component boundaries and structural divisions.

## Typography
The system uses **Inter** for its neutral, systematic qualities and excellent legibility at small sizes. 
- Headlines use a semi-bold weight with slight negative letter-spacing to appear modern and grounded.
- Body text maintains a standard 1.5x line height for optimal readability.
- Labels use a bold, uppercase style to differentiate structural metadata from user content.
- For mobile, large headlines scale down to prevent excessive wrapping while maintaining hierarchy.

## Layout & Spacing
This design system utilizes a **Fluid Grid** model based on an 8px square rhythm.
- **Desktop**: 12-column grid with 32px outer margins and 16px gutters.
- **Tablet**: 8-column grid with 24px outer margins and 16px gutters.
- **Mobile**: 4-column grid with 16px outer margins and 12px gutters.

Spacing follows a linear scale: `4px` for tight internal groupings, `24px` for standard module vertical spacing, and `80px` for major section breaks. Layouts should prioritize vertical stacking on mobile devices, transitioning to side-by-side configurations only when column widths exceed 200px.

## Elevation & Depth
Depth is communicated through **Tonal Layering** rather than shadows. 
- **Level 0 (Base)**: White (#FFFFFF) background.
- **Level 1 (Containers)**: Light Gray (#F3F4F6) fills to indicate distinct zones (e.g., sidebars, cards).
- **Level 2 (Interaction)**: Outlines (#D1D5DB) create a clear boundary between elements.
No shadows are used in this system. Hover states are indicated by shifting the background from white to light gray or by increasing the border weight slightly.

## Shapes
A **Soft** shape language is applied to humanize the structural nature of the wireframes. 
- Standard components (buttons, inputs) use a 0.25rem (4px) radius.
- Large containers and cards use a 0.5rem (8px) radius.
- Imagery placeholders use a simple "X" diagonal cross within a bordered rectangle to indicate content areas.

## Components
- **Buttons**: Outlined style using #D1D5DB borders and #374151 text. Primary buttons may use a solid #374151 fill with white text to show intent.
- **Placeholder Boxes**: Used for logos and images. These are rectangles with a #D1D5DB border and a light gray #F3F4F6 fill, containing a centered diagonal cross.
- **Lists**: Simple horizontal dividers (#D1D5DB, 1px) between items. No bullet points unless specifically required for readability; use spacing and typography to define list structure.
- **Inputs**: Outlined fields with #F3F4F6 background and #D1D5DB border. Focused states change the border color to #374151.
- **Cards**: Minimal containers with a 1px border and 24px internal padding.
- **Chips/Badges**: Light gray (#F3F4F6) fills with small-caps labels to categorize information.