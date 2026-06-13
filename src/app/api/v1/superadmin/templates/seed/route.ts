// =============================================================================
// InteriorOS Backend — SuperAdmin API: Templates Seeding
// =============================================================================

import { NextRequest } from 'next/server';
import { withSuperAdmin } from '@/middlewares/superadmin.middleware';
import { connectDB } from '@/lib/db';
import { ProjectTemplate } from '@/models/project-template.model';
import { successResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// Define the seeded templates data
const DEFAULT_TEMPLATES = [
  // 1. 1 BHK
  {
    name: '1 BHK Residential Fit-out',
    category: 'Residential' as const,
    description: 'Perfect for compact modern apartments. Covers civil modifications, modular kitchen setup, space-optimized wardrobes, living area entertainment unit, bathroom sanity fixtures, and warm electrical tracks.',
    wbs: [
      {
        name: 'Block A (Main Structure)',
        floors: [
          {
            name: 'Typical Floor',
            zones: [
              {
                name: 'Appartment Zone',
                areas: [
                  {
                    name: 'Living & Dining Area',
                    packages: [
                      {
                        name: 'Living Carpentry & Panel work',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'TV entertainment console framing', description: 'Framing TV back panel with MDF and decorative laminate.', priority: 'medium' as const, durationDays: 5 },
                          { name: 'Sofa accent wall cladding', description: 'Installing charcoal louvers on the main living wall.', priority: 'low' as const, durationDays: 3 }
                        ]
                      },
                      {
                        name: 'Living Civil & Painting',
                        trade: 'civil' as const,
                        tasks: [
                          { name: 'Wall putty and sanding', description: 'Applying double-coat acrylic putty to prepare walls for paint.', priority: 'medium' as const, durationDays: 4 },
                          { name: 'Luxe emulsion painting', description: 'Final painting coating using royal matte series paint.', priority: 'high' as const, durationDays: 3 }
                        ]
                      }
                    ]
                  },
                  {
                    name: 'Master Bedroom',
                    packages: [
                      {
                        name: 'Bedroom Modular Wardrobe',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'Wardrobe carcass assembly', description: 'Assembling pre-laminated plywood storage frames.', priority: 'high' as const, durationDays: 4 },
                          { name: 'Soft-close sliding shutters', description: 'Fitting tracks and sliding mirrors/doors.', priority: 'medium' as const, durationDays: 3 }
                        ]
                      }
                    ]
                  },
                  {
                    name: 'Modular Kitchen',
                    packages: [
                      {
                        name: 'Kitchen Counters & Cabinets',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'Base cabinets installation', description: 'Mounting waterproof plywood cabinets with soft-close drawers.', priority: 'high' as const, durationDays: 6 },
                          { name: 'Wall cabinet overhead mounting', description: 'Installing upper profile glass overhead shelves.', priority: 'medium' as const, durationDays: 4 }
                        ]
                      },
                      {
                        name: 'Kitchen Services & Tiling',
                        trade: 'phe' as const,
                        tasks: [
                          { name: 'Dado tile installation', description: 'Laying 2x1 ceramic dado tiles above the quartz platform.', priority: 'medium' as const, durationDays: 3 },
                          { name: 'Sink & CP plumbing fittings', description: 'Connecting single bowl sink and pull-out faucet.', priority: 'high' as const, durationDays: 2 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    milestones: [
      { name: 'Project Kickoff & Civil Prep', offsetDays: 0, linkedTaskNames: ['Wall putty and sanding'] },
      { name: 'Kitchen Dado & Plumbing Complete', offsetDays: 12, linkedTaskNames: ['Dado tile installation', 'Sink & CP plumbing fittings'] },
      { name: 'Modular Wardrobe & Base Cabinets Installed', offsetDays: 30, linkedTaskNames: ['Wardrobe carcass assembly', 'Base cabinets installation'] },
      { name: 'Painting & Handover Ceremony', offsetDays: 45, linkedTaskNames: ['Luxe emulsion painting'] }
    ],
    procurement: [
      {
        vendorName: 'Durian Plywoods',
        materialName: '18mm Marine Plywood & Hardware',
        amount: 110000,
        items: [
          { name: '18mm BWR Waterproof Ply', quantity: 20, unit: 'sheets', unitPrice: 3500 },
          { name: 'Soft-close Drawer Runners', quantity: 12, unit: 'sets', unitPrice: 1500 },
          { name: 'Telescopic hinges', quantity: 30, unit: 'nos', unitPrice: 400 }
        ]
      },
      {
        vendorName: 'Hettich Hardware Store',
        materialName: 'Kitchen profile handles & hinges',
        amount: 32000,
        items: [
          { name: 'Premium Cabinet handles', quantity: 20, unit: 'nos', unitPrice: 600 },
          { name: 'Gola Profile Channel G-type', quantity: 10, unit: 'mtrs', unitPrice: 2000 }
        ]
      }
    ]
  },
  // 2. 2 BHK
  {
    name: '2 BHK Residential Fit-out',
    category: 'Residential' as const,
    description: 'Dynamic family home. Includes comprehensive living/dining lounge, modular L-shaped kitchen, master bedroom modular wardrobe with bed, secondary kids bedroom storage bed and study, False ceilings, and plumbing.',
    wbs: [
      {
        name: 'Block B (Residence Wing)',
        floors: [
          {
            name: 'Typical Floor',
            zones: [
              {
                name: 'Apartment Core',
                areas: [
                  {
                    name: 'Living & Dining Room',
                    packages: [
                      {
                        name: 'Living False Ceiling',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'Gypsum ceiling framing', description: 'Mounting GI channels suspended ceiling frame.', priority: 'medium' as const, durationDays: 5 },
                          { name: 'Ceiling plasterboarding', description: 'Screwing gypsum boards and taping joints.', priority: 'medium' as const, durationDays: 3 }
                        ]
                      }
                    ]
                  },
                  {
                    name: 'Master Bedroom',
                    packages: [
                      {
                        name: 'Master King Bed & Wardrobe',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'King Bed structure framing', description: 'Building plywood base frame with hydraulic lift-up mechanism.', priority: 'high' as const, durationDays: 5 },
                          { name: 'Master sliding wardrobe setup', description: 'Mounting high sliding doors and internal vanity chest.', priority: 'high' as const, durationDays: 6 }
                        ]
                      }
                    ]
                  },
                  {
                    name: 'Kids Bedroom',
                    packages: [
                      {
                        name: 'Kids Wardrobe & Study Desk',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'Kids wardrobe assembly', description: 'Assembling carcass in colored laminates.', priority: 'medium' as const, durationDays: 4 },
                          { name: 'Floating study desk mounting', description: 'Installing custom study table with drawers.', priority: 'low' as const, durationDays: 3 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    milestones: [
      { name: 'Project Commencement', offsetDays: 0, linkedTaskNames: ['Gypsum ceiling framing'] },
      { name: 'False Ceilings Completed', offsetDays: 14, linkedTaskNames: ['Ceiling plasterboarding'] },
      { name: 'Bedroom Furniture Assembled', offsetDays: 35, linkedTaskNames: ['King Bed structure framing', 'Kids wardrobe assembly'] },
      { name: 'Final Polish & Handover', offsetDays: 55, linkedTaskNames: ['Master sliding wardrobe setup', 'Floating study desk mounting'] }
    ],
    procurement: [
      {
        vendorName: 'Gyproc Saint-Gobain',
        materialName: 'Gypsum Boards & GI Framework',
        amount: 45000,
        items: [
          { name: '12mm Gypsum Board', quantity: 50, unit: 'sheets', unitPrice: 400 },
          { name: 'GI Ceiling Section 12ft', quantity: 80, unit: 'nos', unitPrice: 200 },
          { name: 'Jointing Compound 20kg bag', quantity: 5, unit: 'bags', unitPrice: 1800 }
        ]
      }
    ]
  },
  // 3. Villa
  {
    name: 'Luxury Villa Fit-out',
    category: 'Residential' as const,
    description: 'High-end multi-story custom mansion. Features ground floor day zone, double height lobby, custom marble flooring, premium automation, first floor family night suites, walk-in closets, home theater, and garden deck.',
    wbs: [
      {
        name: 'Main Villa Mansion',
        floors: [
          {
            name: 'Ground Floor',
            zones: [
              {
                name: 'Living Zone',
                areas: [
                  {
                    name: 'Double Height Lobby & Lounge',
                    packages: [
                      {
                        name: 'Marble Flooring & Cladding',
                        trade: 'civil' as const,
                        tasks: [
                          { name: 'Italian marble slab laying', description: 'Laying 20mm select Statuario marble matching veins.', priority: 'critical' as const, durationDays: 15 },
                          { name: 'Diamond mirror polishing', description: 'Applying 8 stages of diamond abrasive floor polishing.', priority: 'high' as const, durationDays: 10 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            name: 'First Floor',
            zones: [
              {
                name: 'Suites Zone',
                areas: [
                  {
                    name: 'Luxury Master Suite',
                    packages: [
                      {
                        name: 'Walk-in Closet & Vanity',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'Open closet wardrobe carcass', description: 'Installing premium dark oak open hanger drawers.', priority: 'high' as const, durationDays: 8 },
                          { name: 'Sensor profile LED channels', description: 'Fitting motion activated LEDs inside cabinet slots.', priority: 'medium' as const, durationDays: 4 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    milestones: [
      { name: 'Structural Handover & Marble Laying Start', offsetDays: 0, linkedTaskNames: ['Italian marble slab laying'] },
      { name: 'Marble Polishing & Floor Finish', offsetDays: 30, linkedTaskNames: ['Diamond mirror polishing'] },
      { name: 'Closet Carcass & Sensor LED Installation', offsetDays: 75, linkedTaskNames: ['Open closet wardrobe carcass', 'Sensor profile LED channels'] },
      { name: 'Villa Handover', offsetDays: 120, linkedTaskNames: [] }
    ],
    procurement: [
      {
        vendorName: 'Classic Marble Company',
        materialName: 'Italian Statuario Marble Slabs',
        amount: 600000,
        items: [
          { name: 'Statuario Marble Slab 20mm', quantity: 1200, unit: 'sqft', unitPrice: 500 }
        ]
      }
    ]
  },
  // 4. Office
  {
    name: 'Corporate Office Fit-out',
    category: 'Commercial' as const,
    description: 'Modern workspace template. Features executive reception lobby, glass-partitioned manager cabins, open-plan workstation bays, acoustic ceiling grids, conference A/V panels, networking, and server room HVAC.',
    wbs: [
      {
        name: 'Office Space Wing A',
        floors: [
          {
            name: '8th Floor',
            zones: [
              {
                name: 'Core Workspace',
                areas: [
                  {
                    name: 'Reception & Entrance Lobby',
                    packages: [
                      {
                        name: 'Reception Desk & Stone Wall',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'Quartz counter cash desk framing', description: 'Welding metal base frame and mounting quartz top.', priority: 'high' as const, durationDays: 5 },
                          { name: 'Corporate logo backboard panel', description: 'Mounting acrylic board with LED backlights.', priority: 'medium' as const, durationDays: 3 }
                        ]
                      }
                    ]
                  },
                  {
                    name: 'Workstation Bay',
                    packages: [
                      {
                        name: 'Modular Desking & Networking',
                        trade: 'electrical' as const,
                        tasks: [
                          { name: 'CAT6 LAN cabling & conduits', description: 'Pulling network cables from server rack to desks.', priority: 'high' as const, durationDays: 7 },
                          { name: 'Underdesk power track mounting', description: 'Mounting linear power rails for workspaces.', priority: 'medium' as const, durationDays: 4 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    milestones: [
      { name: 'Lobby Framing & Cabling Start', offsetDays: 0, linkedTaskNames: ['CAT6 LAN cabling & conduits'] },
      { name: 'Networking & Power Tracks Completed', offsetDays: 20, linkedTaskNames: ['Underdesk power track mounting'] },
      { name: 'Reception Lobby Complete & Desk Mounted', offsetDays: 45, linkedTaskNames: ['Quartz counter cash desk framing', 'Corporate logo backboard panel'] },
      { name: 'Office Workspaces Handover', offsetDays: 60, linkedTaskNames: [] }
    ],
    procurement: [
      {
        vendorName: 'Finolex Cables Ltd',
        materialName: 'CAT6 Networking & Power Cables',
        amount: 85000,
        items: [
          { name: 'CAT6 LAN Cable box 305m', quantity: 5, unit: 'boxes', unitPrice: 9000 },
          { name: '2.5 sqmm FR copper wire', quantity: 20, unit: 'coils', unitPrice: 2000 }
        ]
      }
    ]
  },
  // 5. Retail
  {
    name: 'Retail Boutique Fit-out',
    category: 'Commercial' as const,
    description: 'Perfect for retail fashion stores and showrooms. Focuses on premium shopfront glass facades, perimeter display hangers, central accent platforms, track spotlight clusters, cash countertops, and change rooms.',
    wbs: [
      {
        name: 'Boutique Store',
        floors: [
          {
            name: 'Ground Floor',
            zones: [
              {
                name: 'Showroom Floor',
                areas: [
                  {
                    name: 'Display Bay',
                    packages: [
                      {
                        name: 'Metal Racks & Accent Shelves',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'Brass display hangers framing', description: 'Welding and coating brass finish perimeter racks.', priority: 'high' as const, durationDays: 5 },
                          { name: 'Floating display led shelves', description: 'Mounting shelves with integrated warm strip lights.', priority: 'medium' as const, durationDays: 4 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    milestones: [
      { name: 'Boutique Fit-out Commencement', offsetDays: 0, linkedTaskNames: ['Brass display hangers framing'] },
      { name: 'Display Hangers & LED Shelves Up', offsetDays: 20, linkedTaskNames: ['Floating display led shelves'] },
      { name: 'Retail Store Handover', offsetDays: 40, linkedTaskNames: [] }
    ],
    procurement: [
      {
        vendorName: 'Jaquar Steel & Fittings',
        materialName: 'Brass finish clothes racks',
        amount: 72000,
        items: [
          { name: 'Heavy duty hanging tracks', quantity: 12, unit: 'nos', unitPrice: 6000 }
        ]
      }
    ]
  },
  // 6. Restaurant
  {
    name: 'QSR & Restaurant Setup',
    category: 'Commercial' as const,
    description: 'Commercial kitchen and dining. Covers stainless steel kitchen counters, heavy HVAC exhaust hoods, commercial LPG gas piping, wash bays, acoustic dining halls, bar counters, and architectural lighting.',
    wbs: [
      {
        name: 'Diner Facility',
        floors: [
          {
            name: 'Ground Floor',
            zones: [
              {
                name: 'Kitchen Area',
                packages: [
                  {
                    name: 'Exhaust Hood & Ducting',
                    trade: 'hvac' as const,
                    tasks: [
                      { name: 'SS exhaust hood mounting', description: 'Suspending heavy-duty stainless steel hood above ranges.', priority: 'critical' as const, durationDays: 4 },
                      { name: 'Galvanized iron duct laying', description: 'Installing duct pipes with silencers through outer wall.', priority: 'high' as const, durationDays: 7 }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    milestones: [
      { name: 'Kitchen Exhaust Installation Start', offsetDays: 0, linkedTaskNames: ['SS exhaust hood mounting'] },
      { name: 'Exhaust Hood & HVAC Ducting Commissioned', offsetDays: 25, linkedTaskNames: ['Galvanized iron duct laying'] },
      { name: 'Restaurant Operations Handover', offsetDays: 60, linkedTaskNames: [] }
    ],
    procurement: [
      {
        vendorName: 'Alfa Kitchen Equipments',
        materialName: 'SS exhaust hoods and blowers',
        amount: 155000,
        items: [
          { name: 'Stainless Steel Exhaust Hood 8ft', quantity: 1, unit: 'nos', unitPrice: 95000 },
          { name: '2HP Duct Blower fan', quantity: 1, unit: 'nos', unitPrice: 60000 }
        ]
      }
    ]
  },
  // 7. Salon
  {
    name: 'Salon & Spa Studio',
    category: 'Commercial' as const,
    description: 'Beauty and wellness setup. Focuses on styling mirror consoles, integrated hair dryer plug grids, shampoo wash station plumbing, hot water loop, VIP massage room partitions, and premium styling storage units.',
    wbs: [
      {
        name: 'Salon Suite',
        floors: [
          {
            name: 'Ground Floor',
            zones: [
              {
                name: 'Styling Floor',
                areas: [
                  {
                    name: 'Styling Stations',
                    packages: [
                      {
                        name: 'Mirror Consoles & LED bars',
                        trade: 'interior' as const,
                        tasks: [
                          { name: 'Custom styling mirror framing', description: 'Building timber backing frames for styling mirrors.', priority: 'high' as const, durationDays: 5 },
                          { name: 'Backlit warm LEDs mounting', description: 'Pasting strip light panels for diffused mirror light.', priority: 'medium' as const, durationDays: 3 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    milestones: [
      { name: 'Salon Framing Start', offsetDays: 0, linkedTaskNames: ['Custom styling mirror framing'] },
      { name: 'Mirror Panels & Backlit LEDs Installed', offsetDays: 20, linkedTaskNames: ['Backlit warm LEDs mounting'] },
      { name: 'Salon Launch Handover', offsetDays: 40, linkedTaskNames: [] }
    ],
    procurement: [
      {
        vendorName: 'Garg Glass & Mirrors',
        materialName: 'Select float glass styling mirrors',
        amount: 38000,
        items: [
          { name: '8mm clear glass mirrors 6x3ft', quantity: 6, unit: 'nos', unitPrice: 5000 },
          { name: 'LED strip light roll 5m', quantity: 10, unit: 'rolls', unitPrice: 800 }
        ]
      }
    ]
  },
  // 8. Clinic
  {
    name: 'Medical Clinic Setup',
    category: 'Commercial' as const,
    description: 'Professional healthcare clinic. Features patient waiting lobbies, doctor consulting suites, antibacterial seamless vinyl flooring, computer networking, medical diagnostics power backups, and examination desks.',
    wbs: [
      {
        name: 'Care Clinic',
        floors: [
          {
            name: '1st Floor',
            zones: [
              {
                name: 'Clinic Chambers',
                areas: [
                  {
                    name: 'Waiting Lounge',
                    packages: [
                      {
                        name: 'Antibacterial Flooring',
                        trade: 'civil' as const,
                        tasks: [
                          { name: 'Self-leveling compound underlay', description: 'Applying compound to ensure perfectly flat screed floor.', priority: 'high' as const, durationDays: 4 },
                          { name: 'PVC vinyl roll laying & welding', description: 'Laying antibacterial vinyl flooring with hot welding rods.', priority: 'critical' as const, durationDays: 5 }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    milestones: [
      { name: 'Screed Preparation Start', offsetDays: 0, linkedTaskNames: ['Self-leveling compound underlay'] },
      { name: 'Antibacterial Flooring Laid & Welded', offsetDays: 15, linkedTaskNames: ['PVC vinyl roll laying & welding'] },
      { name: 'Clinic Handover', offsetDays: 50, linkedTaskNames: [] }
    ],
    procurement: [
      {
        vendorName: 'Armstrong Vinyl Flooring',
        materialName: 'Medical antibacterial vinyl rolls',
        amount: 140000,
        items: [
          { name: 'Med-Tech PVC flooring rolls', quantity: 1500, unit: 'sqft', unitPrice: 80 },
          { name: 'PVC welding rods bundle', quantity: 4, unit: 'bundles', unitPrice: 5000 }
        ]
      }
    ]
  }
];

/**
 * POST /api/v1/superadmin/templates/seed — Seed default marketplace templates
 */
export const POST = withSuperAdmin(
  async (_req: NextRequest, _context: { params: Promise<Record<string, string>> }, _auth: JwtPayload) => {
    try {
      await connectDB();

      // Soft delete existing default templates to allow clean re-seeding
      const defaultNames = DEFAULT_TEMPLATES.map((t) => t.name);
      await ProjectTemplate.deleteMany({ name: { $in: defaultNames } });

      // Create new templates
      const createdTemplates = await ProjectTemplate.create(DEFAULT_TEMPLATES);

      return successResponse(
        { count: createdTemplates.length, templates: createdTemplates },
        'Default templates seeded successfully'
      );
    } catch (error) {
      console.error('Seed default templates error:', error);
      return serverErrorResponse();
    }
  }
);
