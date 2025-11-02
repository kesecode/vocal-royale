<section class="section section-spacing">
	<h1 class="font-display heading-responsive">Customization</h1>

	<!-- Tab Navigation -->
	<div class="flex gap-2 mb-4">
		<button
			type="button"
			class="px-4 py-2 rounded-md {activeTab === 'ui'
				? 'bg-accent text-white'
				: 'bg-white/10 text-white/60 hover:text-white'}"
			onclick={() => (activeTab = 'ui')}
		>
			UI-Texte
		</button>
		<button
			type="button"
			class="px-4 py-2 rounded-md {activeTab === 'email'
				? 'bg-accent text-white'
				: 'bg-white/10 text-white/60 hover:text-white'}"
			onclick={() => (activeTab = 'email')}
		>
			Email-Templates
		</button>
	</div>

	{#if form?.message}
		<div
			class="mb-4 text-sm p-3 rounded-md {form.success
				? 'bg-emerald-500/20 text-emerald-200'
				: 'bg-rose-500/20 text-rose-200'}"
		>
			{form.message}
		</div>
	{/if}

	<!-- UI Content Tab -->
	{#if activeTab === 'ui'}
		<div class="panel-table">
			<div class="flex-between table-header-border padding-responsive py-3">
				<div class="font-semibold">UI-Texte verwalten</div>
			</div>

			<div class="space-y-4 p-3 sm:p-4">
				{#each data.uiContent as item (item.id)}
					<div class="border border-white/20 rounded-md p-4 space-y-3 bg-white/5">
						<div class="flex-between">
							<div class="text-sm font-medium">{item.category} - {item.key}</div>
							<button
								type="button"
								class="text-xs text-white/60 hover:text-white"
								onclick={() => toggleEdit('ui', item.id)}
							>
								{editingId === item.id ? 'Abbrechen' : 'Bearbeiten'}
							</button>
						</div>

						{#if editingId === item.id}
							<form method="post" action="?/updateUiContent" use:enhance class="space-y-3">
								<input type="hidden" name="id" value={item.id} />
								<input type="hidden" name="key" value={item.key} />

								<div>
									<label class="block text-xs text-white/80 mb-1" for="value-{item.id}">Text</label>
									<textarea
										id="value-{item.id}"
										name="value"
										rows="3"
										class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
										required
									>
										{item.value}
									</textarea>
									{#if item.variables && item.variables.length > 0}
										<div class="text-xs text-white/50 mt-1">
											Variablen: {item.variables.map((v) => `{${v}}`).join(', ')}
										</div>
									{/if}
								</div>

								<div>
									<label class="block text-xs text-white/80 mb-1" for="category-{item.id}">
										Category
									</label>
									<select
										id="category-{item.id}"
										name="category"
										class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
										required
									>
										<option value="home" selected={item.category === 'home'}>Home</option>
										<option value="auth" selected={item.category === 'auth'}>Auth</option>
										<option value="profile" selected={item.category === 'profile'}>Profile</option>
										<option value="admin" selected={item.category === 'admin'}>Admin</option>
										<option value="rating" selected={item.category === 'rating'}>Rating</option>
										<option value="song_choice" selected={item.category === 'song_choice'}>
											Song Choice
										</option>
									</select>
								</div>

								<div>
									<label class="block text-xs text-white/80 mb-1" for="description-{item.id}">
										Beschreibung
									</label>
									<input
										id="description-{item.id}"
										type="text"
										name="description"
										value={item.description || ''}
										class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
									/>
								</div>

								<div class="flex items-center gap-2">
									<input
										id="active-ui-{item.id}"
										type="checkbox"
										name="is_active"
										value="true"
										checked={item.is_active}
										class="rounded border-white/20 bg-white/10"
									/>
									<label for="active-ui-{item.id}" class="text-sm text-white/80">Aktiv</label>
								</div>

								<div class="flex gap-2">
									<button type="submit" class="btn-brand text-sm" disabled={updating}>
										{updating ? 'Speichere...' : 'Speichern'}
									</button>
									<button
										type="button"
										class="btn-ghost text-sm"
										onclick={() => (editingId = null)}
									>
										Abbrechen
									</button>
								</div>
							</form>
						{:else}
							<div class="text-xs text-white/60">
								<div>
									<strong>Text:</strong>
									{item.value}
								</div>
								{#if item.description}
									<div class="mt-1">
										<strong>Beschreibung:</strong>
										{item.description}
									</div>
								{/if}
								<div class="mt-1">
									<strong>Status:</strong>
									{item.is_active ? '✓ Aktiv' : '✗ Inaktiv'}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="text-sm text-white/60">Keine UI-Texte gefunden</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Email Templates Tab -->
	{#if activeTab === 'email'}
		<div class="panel-table">
			<div class="flex-between table-header-border padding-responsive py-3">
				<div class="font-semibold">Email-Templates verwalten</div>
				<form method="post" action="?/syncTemplates" use:enhance>
					<button type="submit" class="btn-accent text-xs" disabled={syncing}>
						{syncing ? 'Synchronisiere...' : 'Templates synchronisieren'}
					</button>
				</form>
			</div>

			<div class="space-y-4 p-3 sm:p-4">
				{#each data.emailTemplates as template (template.id)}
					<div class="border border-white/20 rounded-md p-4 space-y-3 bg-white/5">
						<div class="flex-between">
							<div class="text-sm font-medium">
								{template.collection_ref} - {template.template_type}
							</div>
							<button
								type="button"
								class="text-xs text-white/60 hover:text-white"
								onclick={() => toggleEdit('email', template.id)}
							>
								{editingId === template.id ? 'Abbrechen' : 'Bearbeiten'}
							</button>
						</div>

						{#if editingId === template.id}
							<form method="post" action="?/updateEmailTemplate" use:enhance class="space-y-3">
								<input type="hidden" name="id" value={template.id} />
								<input type="hidden" name="template_type" value={template.template_type} />
								<input type="hidden" name="collection_ref" value={template.collection_ref} />

								<div>
									<label class="block text-xs text-white/80 mb-1" for="subject-{template.id}">
										Subject
									</label>
									<input
										id="subject-{template.id}"
										type="text"
										name="subject"
										value={template.subject}
										class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
										required
									/>
								</div>

								<div>
									<label class="block text-xs text-white/80 mb-1" for="body-{template.id}">
										Body (HTML)
									</label>
									<textarea
										id="body-{template.id}"
										name="body"
										rows="15"
										class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm font-mono"
										required
									>
										{template.body}
									</textarea>
									<div class="text-xs text-white/50 mt-1">
										Variablen: {'{APP_NAME}'}, {'{APP_URL}'}, {'{TOKEN}'}
									</div>
								</div>

								<div class="flex items-center gap-2">
									<input
										id="active-email-{template.id}"
										type="checkbox"
										name="is_active"
										value="true"
										checked={template.is_active}
										class="rounded border-white/20 bg-white/10"
									/>
									<label for="active-email-{template.id}" class="text-sm text-white/80">
										Aktiv
									</label>
								</div>

								<div class="flex gap-2">
									<button type="submit" class="btn-brand text-sm" disabled={updating}>
										{updating ? 'Speichere...' : 'Speichern'}
									</button>
									<button
										type="button"
										class="btn-ghost text-sm"
										onclick={() => (editingId = null)}
									>
										Abbrechen
									</button>
								</div>
							</form>
						{:else}
							<div class="text-xs text-white/60">
								<div>
									<strong>Subject:</strong>
									{template.subject}
								</div>
								<div class="mt-1">
									<strong>Status:</strong>
									{template.is_active ? '✓ Aktiv' : '✗ Inaktiv'}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="text-sm text-white/60">Keine Email-Templates gefunden</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<script lang="ts">
	import { enhance } from '$app/forms'

	let { data, form } = $props()

	let activeTab = $state<'ui' | 'email'>('ui')
	let editingId = $state<string | null>(null)
	let updating = $state(false)
	let syncing = $state(false)

	function toggleEdit(tab: 'ui' | 'email', id: string) {
		editingId = editingId === id ? null : id
	}
</script>
