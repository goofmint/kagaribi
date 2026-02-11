import type { FC } from 'hono/jsx';

/**
 * Homepage view component
 * Contains only presentation logic
 */
export const HomePage: FC = () => {
  return (
    <div>
      <h1>Welcome to Kagaribi Basic Example</h1>
      <p style="font-size: 1.2em; color: #666; margin: 1rem 0 2rem 0;">
        This application demonstrates recommended patterns for using external JSX templates.
      </p>

      <section style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h2 style="color: #667eea; margin-bottom: 1rem;">🎯 Key Features</h2>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 0.5rem 0; border-bottom: 1px solid #e9ecef;">
            ✅ <strong>Clear Separation of Views and Logic</strong> - Route handlers focus only on request processing
          </li>
          <li style="padding: 0.5rem 0; border-bottom: 1px solid #e9ecef;">
            ✅ <strong>Reusable Components</strong> - JSX templates as external files
          </li>
          <li style="padding: 0.5rem 0; border-bottom: 1px solid #e9ecef;">
            ✅ <strong>Type-Safe Props</strong> - Type checking with TypeScript interfaces
          </li>
          <li style="padding: 0.5rem 0;">
            ✅ <strong>jsxRenderer Middleware</strong> - Shared layout and c.render() pattern
          </li>
        </ul>
      </section>

      <section>
        <h2 style="color: #667eea; margin-bottom: 1rem;">📚 Demo Pages</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
          <a href="/auth/login" style="display: block; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; transition: transform 0.2s;">
            <h3 style="margin-bottom: 0.5rem;">🔐 Authentication</h3>
            <p style="opacity: 0.9; font-size: 0.9em;">Login form demo</p>
          </a>
          <a href="/users/view/list" style="display: block; padding: 1.5rem; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; text-decoration: none; border-radius: 8px; transition: transform 0.2s;">
            <h3 style="margin-bottom: 0.5rem;">👥 Users</h3>
            <p style="opacity: 0.9; font-size: 0.9em;">External view components example</p>
          </a>
          <a href="/dashboard" style="display: block; padding: 1.5rem; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; text-decoration: none; border-radius: 8px; transition: transform 0.2s;">
            <h3 style="margin-bottom: 0.5rem;">📊 Dashboard</h3>
            <p style="opacity: 0.9; font-size: 0.9em;">Cross-package integration demo</p>
          </a>
        </div>
      </section>
    </div>
  );
};
