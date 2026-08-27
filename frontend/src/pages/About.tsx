import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Target,
  Eye,
  Rocket,
  Users,
  Palette,
  Gamepad2,
  Code2,
  Swords,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true as const },
  transition: { duration: 0.6 },
};

const timeline = [
  { year: '2019', title: 'The Beginning', desc: 'VytoVerse started as a small coding club with 15 passionate founders.' },
  { year: '2020', title: 'Going Virtual', desc: 'Adapted to remote-first operations, hosting online hackathons and workshops.' },
  { year: '2021', title: 'Community Growth', desc: 'Grew to 100+ active members with chapters across multiple departments.' },
  { year: '2022', title: 'Industry Partnerships', desc: 'Partnered with tech companies for mentorships, internships, and events.' },
  { year: '2023', title: 'Open Source', desc: 'Launched major open-source projects adopted by developers worldwide.' },
  { year: '2024', title: 'VytoVerse Platform', desc: 'Built the VytoVerse platform to connect and empower tech communities.' },
];

const officialEvents = [
  {
    icon: Palette,
    title: 'Artistry Arena',
    category: 'Canva Designing Competition',
    desc: 'Showcase your creativity and design skills in this exciting Canva competition.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  {
    icon: Gamepad2,
    title: 'Elite Combat Cup',
    category: 'Gaming Tournament',
    desc: 'Compete in an exciting gaming tournament with bracket-style elimination.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  {
    icon: Code2,
    title: 'AlgoQuizathon',
    category: 'Programming Tech Quiz',
    desc: 'Test your algorithmic thinking and programming knowledge in team rounds.',
    color: 'text-vyto-cyan',
    bg: 'bg-vyto-cyan/10',
    border: 'border-vyto-cyan/20',
  },
  {
    icon: Swords,
    title: 'Vyto HackClash',
    category: '36-Hours Hackathon',
    desc: 'Push your limits in a 36-hour hackathon building innovative solutions from scratch.',
    color: 'text-vyto-violet',
    bg: 'bg-vyto-violet/10',
    border: 'border-vyto-violet/20',
  },
];

export default function About() {
  return (
    <div className="relative pt-24">
      {/* Hero */}
      <section className="section-padding pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">About VytoVerse</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mt-4 mb-6 leading-tight">
              We build the future,{' '}
              <span className="gradient-text">together.</span>
            </h1>
            <p className="text-lg text-vyto-text-secondary max-w-2xl mx-auto leading-relaxed">
              VytoVerse is more than a technology club — it's a movement. We believe every student has the potential
              to create something extraordinary, and we provide the community, resources, and mentorship to make it happen.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding py-16 bg-vyto-bg-2/30">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          <motion.div {...fadeUp} className="glass-card p-8 lg:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vyto-cyan/40 to-transparent" />
            <div className="w-14 h-14 rounded-xl bg-vyto-cyan/10 flex items-center justify-center mb-5">
              <Target className="w-7 h-7 text-vyto-cyan" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
            <p className="text-vyto-text-secondary leading-relaxed">
              To empower college students with the skills, knowledge, and community they need to become
              exceptional technologists. We bridge the gap between academic learning and industry readiness
              through hands-on projects, expert mentorship, and collaborative innovation.
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className="glass-card p-8 lg:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vyto-violet/40 to-transparent" />
            <div className="w-14 h-14 rounded-xl bg-vyto-violet/10 flex items-center justify-center mb-5">
              <Eye className="w-7 h-7 text-vyto-violet" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
            <p className="text-vyto-text-secondary leading-relaxed">
              To become the most impactful college technology community in the nation — a place where
              the next generation of founders, engineers, and innovators are born. We envision a world
              where every student has access to a thriving tech community.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Official Events */}
      <section className="section-padding py-16">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">What We Do</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">Our signature events</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {officialEvents.map(({ icon: Icon, title, category, desc, color, bg, border }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="glass-card-hover p-6"
              >
                <div className={`w-12 h-12 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                <p className={`text-sm font-medium ${color} mb-2`}>{category}</p>
                <p className="text-sm text-vyto-text-muted leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="section-padding py-16 bg-vyto-bg-2/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeUp}>
              <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">Why Join</span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-6">
                Become part of something bigger
              </h2>
              <div className="space-y-3">
                {[
                  'Access to exclusive workshops and industry experts',
                  'Build real projects for your portfolio',
                  'Compete in hackathons with amazing prizes',
                  'Network with alumni in top tech companies',
                  'Get mentorship from experienced engineers',
                  'Earn recognition through our Stars system',
                  'Grow your skills in a supportive community',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-vyto-cyan shrink-0 mt-0.5" />
                    <span className="text-sm text-vyto-text-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, number: '150+', label: 'Members' },
                { icon: Rocket, number: '25+', label: 'Events' },
                { icon: Target, number: '50+', label: 'Resources' },
                { icon: Eye, number: '10+', label: 'Categories' },
              ].map(({ icon: Icon, number, label }) => (
                <div key={label} className="glass-card p-5 text-center">
                  <Icon className="w-5 h-5 text-vyto-cyan mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{number}</div>
                  <div className="text-xs text-vyto-text-muted mt-1">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="text-sm font-semibold text-vyto-cyan uppercase tracking-wider">Our Journey</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">From a small idea to a movement</h2>
          </motion.div>

          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-vyto-border" />
            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative flex items-start gap-8 mb-8 last:mb-0 ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                <div className={`hidden md:block md:w-1/2 ${i % 2 === 0 ? 'text-right pr-12' : 'text-left pl-12'}`}>
                  <div className="glass-card p-5 inline-block text-left">
                    <div className="text-sm font-bold text-vyto-cyan mb-1">{item.year}</div>
                    <h4 className="text-base font-semibold text-white mb-1">{item.title}</h4>
                    <p className="text-sm text-vyto-text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-vyto-cyan border-2 border-vyto-bg z-10 shadow-[0_0_8px_rgba(0,212,255,0.3)]" />
                <div className="md:hidden pl-10">
                  <div className="glass-card p-5">
                    <div className="text-sm font-bold text-vyto-cyan mb-1">{item.year}</div>
                    <h4 className="text-base font-semibold text-white mb-1">{item.title}</h4>
                    <p className="text-sm text-vyto-text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
                <div className="hidden md:block md:w-1/2" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding py-16 bg-vyto-bg-2/30">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to be part of <span className="gradient-text">VytoVerse</span>?
          </h2>
          <p className="text-lg text-vyto-text-secondary mb-8">
            Join hundreds of students who are building the future together.
          </p>
          <Link to="/signup" className="btn-primary text-base !py-3 !px-8 group">
            Join Now <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
