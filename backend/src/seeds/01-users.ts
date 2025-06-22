import { SeedConfig } from './index';

export async function seedUsers(supabase: any, _config: SeedConfig) {
  console.log('  Creating demo users...');

  // Create demo user using Supabase Auth Admin API
  const demoUser = {
    email: 'demo@praxis.edu',
    password: 'demo123456',
    email_confirm: true,
    user_metadata: {
      name: 'Demo User',
      bio: 'A passionate learner exploring various academic subjects.',
    },
  };

  try {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: demoUser.email,
      password: demoUser.password,
      email_confirm: demoUser.email_confirm,
      user_metadata: demoUser.user_metadata,
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        console.log('    Demo user already exists, fetching...');
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find((u: any) => u.email === demoUser.email);
        if (existingUser) {
          await ensurePublicUser(supabase, existingUser);
          await createUserPreferences(supabase, existingUser.id);
          await createApiKeys(supabase, existingUser.id);
        }
      } else {
        throw authError;
      }
    } else if (authUser?.user) {
      console.log('    ✓ Created demo auth user');
      await ensurePublicUser(supabase, authUser.user);
      await createUserPreferences(supabase, authUser.user.id);
      await createApiKeys(supabase, authUser.user.id);
    }

    // Create additional test users for collaboration
    const testUsers = [
      {
        email: 'alice@praxis.edu',
        password: 'alice123456',
        name: 'Alice Johnson',
        bio: 'Research scientist specializing in quantum physics.',
      },
      {
        email: 'bob@praxis.edu',
        password: 'bob123456',
        name: 'Bob Smith',
        bio: 'Mathematics professor with focus on topology.',
      },
      {
        email: 'carol@praxis.edu',
        password: 'carol123456',
        name: 'Carol Davis',
        bio: 'Computer science PhD student working on AI/ML.',
      },
    ];

    for (const testUser of testUsers) {
      try {
        const { data: authUser, error } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            name: testUser.name,
            bio: testUser.bio,
          },
        });

        if (!error && authUser?.user) {
          await ensurePublicUser(supabase, authUser.user);
          await createUserPreferences(supabase, authUser.user.id);
          console.log(`    ✓ Created test user: ${testUser.email}`);
        }
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          console.error(`    ✗ Error creating ${testUser.email}:`, error.message);
        }
      }
    }

  } catch (error) {
    console.error('Error in user seeding:', error);
    throw error;
  }
}

async function ensurePublicUser(supabase: any, authUser: any) {
  // Create or update public user record
  const { error } = await supabase
    .from('users')
    .upsert({
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email.split('@')[0],
      created_at: authUser.created_at,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating public user:', error);
  }
}

async function createUserPreferences(supabase: any, userId: string) {
  const preferences = {
    user_id: userId,
    active_provider: 'anthropic',
    theme: 'dark',
    language: 'en',
    timezone: 'America/Los_Angeles',
    notifications_enabled: true,
    auto_save: true,
    study_reminders: true,
    default_study_time: '19:00',
    cards_per_session: 20,
    difficulty_preference: 'adaptive',
  };

  const { error } = await supabase
    .from('user_preferences')
    .upsert(preferences)
    .select()
    .single();

  if (error && !error.message.includes('duplicate')) {
    console.error('Error creating user preferences:', error);
  }
}

async function createApiKeys(supabase: any, userId: string) {
  const apiKeys = [
    {
      user_id: userId,
      provider: 'anthropic',
      api_key: 'sk-ant-demo-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      is_active: true,
    },
    {
      user_id: userId,
      provider: 'openai',
      api_key: 'sk-demo-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      is_active: false,
    },
  ];

  for (const key of apiKeys) {
    const { error } = await supabase
      .from('api_keys')
      .upsert(key)
      .select()
      .single();

    if (error && !error.message.includes('duplicate')) {
      console.error('Error creating API key:', error);
    }
  }
}

export async function cleanupUsers(supabase: any) {
  // Note: We don't delete auth users here as it requires special handling
  // Just clean up related data
  const emails = ['demo@praxis.edu', 'alice@praxis.edu', 'bob@praxis.edu', 'carol@praxis.edu'];
  
  // Get user IDs
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .in('email', emails);

  if (users && users.length > 0) {
    const userIds = users.map((u: any) => u.id);
    
    // Delete in order to respect foreign key constraints
    await supabase.from('api_keys').delete().in('user_id', userIds);
    await supabase.from('user_preferences').delete().in('user_id', userIds);
    await supabase.from('users').delete().in('id', userIds);
  }
}