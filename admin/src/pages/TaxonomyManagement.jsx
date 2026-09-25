import { useEffect, useMemo, useState } from 'react'
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Layers,
  Car,
  Trash2,
  RefreshCw,
  FolderPlus,
  Building2,
  Edit,
  X,
} from 'lucide-react'
import { Accordion, AccordionItem, AccordionHeader, AccordionBody } from '../components/Accordion.jsx'
import { taxonomyApi, normalizeBrand, normalizeCategory, REGION_LABELS } from '../api/taxonomy.js'

const COUNTRY_REGION = {
  Japan: 'japanese',
  Germany: 'european',
  Italy: 'european',
  'United Kingdom': 'european',
  France: 'european',
  'United States': 'american',
  'South Korea': 'korean',
}

export default function TaxonomyManagement() {
  const [activeTab, setActiveTab] = useState('vehicles') // vehicles | categories
  const [taxonomy, setTaxonomy] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('ALL')
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Modal States
  const [brandModalOpen, setBrandModalOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [targetBrand, setTargetBrand] = useState(null)
  const [editingBrand, setEditingBrand] = useState(null)
  const [editingModel, setEditingModel] = useState(null) // { brandId, model }
  const [editingCategory, setEditingCategory] = useState(null)
  const [subDrafts, setSubDrafts] = useState({})

  // New Brand Form
  const [newBrandForm, setNewBrandForm] = useState({
    brand: '',
    country: 'Japan',
  })

  // New Model Form
  const [newModelForm, setNewModelForm] = useState({
    name: '',
    years: '2020 - Present',
    chassisCode: '',
    engines: '',
  })

  // New Category Form
  const [newCategoryForm, setNewCategoryForm] = useState({
    name: '',
    code: '',
    subcategories: '',
  })

  const fetchTaxonomy = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [brands, cats] = await Promise.all([
        taxonomyApi.getBrands(),
        taxonomyApi.getCategories(),
      ])
      setTaxonomy(brands.map(normalizeBrand))
      setCategories(cats.map(normalizeCategory))
    } catch {
      setLoadError('Could not load taxonomy from the server. Check that the backend is running and seeded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaxonomy()
  }, [])

  const availableRegions = useMemo(() => {
    const keys = [...new Set(taxonomy.map((b) => b.region).filter(Boolean))]
    const order = ['japanese', 'european', 'american', 'korean', 'german', 'other']
    return keys.sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [taxonomy])

  const handleAddBrand = async (e) => {
    e.preventDefault()
    if (!newBrandForm.brand.trim()) return
    setSaving(true)
    setActionError(null)
    try {
      if (editingBrand) {
        const updated = await taxonomyApi.updateBrand(editingBrand.id, {
          name: newBrandForm.brand.trim(),
          country: newBrandForm.country,
          region: COUNTRY_REGION[newBrandForm.country] || 'other',
        })
        const norm = normalizeBrand(updated)
        setTaxonomy(taxonomy.map((b) => (
          b.id === editingBrand.id
            ? { ...norm, activeModels: b.activeModels, carsCount: norm.carsCount ?? b.carsCount }
            : b
        )))
        setActionSuccess(`Brand "${updated.name}" updated. Changes are live on the storefront.`)
      } else {
        const created = await taxonomyApi.createBrand({
          name: newBrandForm.brand.trim(),
          country: newBrandForm.country,
          region: COUNTRY_REGION[newBrandForm.country] || 'other',
        })
        setTaxonomy([normalizeBrand(created), ...taxonomy])
        setActionSuccess(`Brand "${created.name}" registered in taxonomy.`)
      }
      setBrandModalOpen(false)
      setEditingBrand(null)
      setNewBrandForm({ brand: '', country: 'Japan' })
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to save brand.')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditBrand = (brandObj) => {
    setEditingBrand(brandObj)
    setNewBrandForm({ brand: brandObj.brand, country: brandObj.country !== '—' ? brandObj.country : 'Japan' })
    setBrandModalOpen(true)
  }

  const handleOpenAddModel = (brandObj) => {
    setTargetBrand(brandObj)
    setEditingModel(null)
    setNewModelForm({
      name: '',
      years: '2020 - Present',
      chassisCode: '',
      engines: '',
    })
    setModelModalOpen(true)
  }

  const handleOpenEditModel = (brandObj, model) => {
    setTargetBrand(brandObj)
    setEditingModel({ brandId: brandObj.id, model })
    setNewModelForm({
      name: model.name || '',
      years: model.years || '2020 - Present',
      chassisCode: model.chassis_code || model.chassisCode || '',
      engines: (model.engines || []).join(', '),
    })
    setModelModalOpen(true)
  }

  const handleAddModel = async (e) => {
    e.preventDefault()
    if (!targetBrand || !newModelForm.name.trim()) return
    setSaving(true)
    setActionError(null)
    try {
      if (editingModel) {
        const updated = await taxonomyApi.updateModel(editingModel.model.id, {
          name: newModelForm.name.trim(),
          chassis_code: newModelForm.chassisCode.trim(),
          years_label: newModelForm.years || '2020 - Present',
          engines: newModelForm.engines
            ? newModelForm.engines.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        })
        setTaxonomy(
          taxonomy.map((b) => {
            if (b.id !== editingModel.brandId) return b
            return {
              ...b,
              activeModels: b.activeModels.map((m) =>
                m.id === editingModel.model.id
                  ? {
                      ...m,
                      name: updated.name,
                      chassis_code: updated.chassis_code,
                      years: updated.years_label || updated.years,
                      engines: updated.engines || [],
                      partsCount: m.partsCount,
                    }
                  : m
              ),
            }
          })
        )
        void norm
        setActionSuccess(`Model "${updated.name}" updated. Storefront dropdowns refresh automatically.`)
      } else {
        await taxonomyApi.createModel(targetBrand.id, {
          name: newModelForm.name.trim(),
          chassis_code: newModelForm.chassisCode.trim(),
          years: newModelForm.years || '2020 - Present',
          engine_text: newModelForm.engines,
        })
        const brands = await taxonomyApi.getBrands()
        setTaxonomy(brands.map(normalizeBrand))
        setActionSuccess(`Model "${newModelForm.name}" added to brand ${targetBrand.brand}.`)
      }
      setModelModalOpen(false)
      setEditingModel(null)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to save model.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryForm.name.trim()) return
    setSaving(true)
    setActionError(null)
    try {
      if (editingCategory) {
        const updated = await taxonomyApi.updateCategory(editingCategory.id, {
          name: newCategoryForm.name.trim(),
          code: newCategoryForm.code.trim() || undefined,
        })
        setCategories(categories.map((c) =>
          c.id === editingCategory.id ? normalizeCategory(updated) : c
        ))
        setActionSuccess(`Category "${updated.name}" updated. Storefront filters refresh automatically.`)
      } else {
        const created = await taxonomyApi.createCategory({
          name: newCategoryForm.name.trim(),
          code: newCategoryForm.code.trim() || undefined,
          subcategory_text: newCategoryForm.subcategories,
        })
        setCategories([normalizeCategory(created), ...categories])
        setActionSuccess(`Category "${created.name}" created.`)
      }
      setCategoryModalOpen(false)
      setEditingCategory(null)
      setNewCategoryForm({ name: '', code: '', subcategories: '' })
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat)
    setNewCategoryForm({ name: cat.name, code: cat.code || '', subcategories: '' })
    setCategoryModalOpen(true)
  }

  const handleAddSubcategory = async (cat) => {
    const name = (subDrafts[cat.id] || '').trim()
    if (!name) return
    setActionError(null)
    try {
      await taxonomyApi.createSubcategory(cat.id, { name })
      const cats = await taxonomyApi.getCategories()
      setCategories(cats.map(normalizeCategory))
      setSubDrafts({ ...subDrafts, [cat.id]: '' })
      setActionSuccess(`Subcategory "${name}" added to ${cat.name}.`)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to add subcategory.')
    }
  }

  const handleDeleteSubcategory = async (cat, sub) => {
    const subName = sub.name || sub
    if (!sub.id || !window.confirm(`Remove subcategory "${subName}"?`)) return
    setActionError(null)
    try {
      await taxonomyApi.deleteSubcategory(sub.id)
      setCategories(categories.map((c) =>
        c.id === cat.id
          ? { ...c, subcategories: c.subcategories.filter((s) => (s.id ?? s.name ?? s) !== (sub.id ?? subName)) }
          : c
      ))
      setActionSuccess('Subcategory removed.')
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to remove subcategory.')
    }
  }

  const handleDeleteModel = async (brandId, modelId) => {
    if (!window.confirm('Are you sure you want to remove this model specification?')) return
    setActionError(null)
    try {
      await taxonomyApi.deleteModel(modelId)
      setTaxonomy(
        taxonomy.map((b) => {
          if (b.id === brandId) {
            return {
              ...b,
              activeModels: b.activeModels.filter((m) => m.id !== modelId),
            }
          }
          return b
        })
      )
      setActionSuccess('Model removed from taxonomy.')
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to remove model.')
    }
  }

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Are you sure you want to remove this category?')) return
    setActionError(null)
    try {
      await taxonomyApi.deleteCategory(catId)
      setCategories(categories.filter((c) => c.id !== catId))
      setActionSuccess('Category removed from catalog taxonomy.')
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to remove category.')
    }
  }

  // Filtered Taxonomy List
  const filteredTaxonomy = taxonomy.filter((item) => {
    const matchesSearch =
      (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.activeModels.some(
        (m) =>
          (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.chassis_code || m.chassisCode || '').toLowerCase().includes(searchQuery.toLowerCase())
      )

    const matchesRegion = selectedRegion === 'ALL' || item.region === selectedRegion

    return matchesSearch && matchesRegion
  })

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(146, 68, 36, 0.1)', color: 'var(--color-rust)' }}>
              <Tag size={20} />
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Brand, Model & Category Taxonomy
            </h1>
          </div>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, margin: 0 }}>
            Standardize manufacturer platforms, chassis fitments, engines, and parts catalog hierarchies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchTaxonomy}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => { setEditingBrand(null); setNewBrandForm({ brand: '', country: 'Japan' }); setBrandModalOpen(true) }}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Building2 size={15} />
            <span>+ Add Brand</span>
          </button>
          <button
            type="button"
            onClick={() => { setEditingCategory(null); setNewCategoryForm({ name: '', code: '', subcategories: '' }); setCategoryModalOpen(true) }}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <FolderPlus size={15} />
            <span>+ Add Category</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--color-emerald)', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {actionError && (
        <div className="admin-card" style={{ padding: '12px 16px', marginBottom: 16, borderColor: 'var(--admin-danger)', background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {loading ? (
        <div className="admin-card" style={{ padding: 48, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Loading taxonomy from database...</div>
        </div>
      ) : loadError ? (
        <div className="admin-card" style={{ padding: 48, textAlign: 'center', color: 'var(--admin-danger)' }}>
          <p>{loadError}</p>
          <button type="button" onClick={fetchTaxonomy} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setActiveTab('vehicles')}
              className={`btn ${activeTab === 'vehicles' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 700 }}
            >
              <Car size={16} />
              <span>Vehicle Brands & Model Specs ({taxonomy.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 700 }}
            >
              <Layers size={16} />
              <span>Parts Categories & Sub-Groups ({categories.length})</span>
            </button>
          </div>

          {/* Tab 1: Vehicle Brands & Models */}
          {activeTab === 'vehicles' && (
            <>
              {/* Search & Region Filters */}
              <div className="admin-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search brand, model name, or chassis code..."
                    className="admin-input"
                    style={{ paddingLeft: 36 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRegion('ALL')}
                    className={`btn btn-sm ${selectedRegion === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    All Origins
                  </button>
                  {availableRegions.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setSelectedRegion(region)}
                      className={`btn btn-sm ${selectedRegion === region ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {REGION_LABELS[region] || region.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accordion Brand List */}
              <Accordion defaultOpen={filteredTaxonomy.slice(0, 2).map((b) => String(b.id))}>
                {filteredTaxonomy.map((brand) => (
                  <AccordionItem key={brand.id} id={String(brand.id)}>
                <AccordionHeader
                  id={String(brand.id)}
                  title={brand.brand}
                  subtitle={`Origin: ${brand.country} · ${brand.activeModels.length} Active Model Platforms`}
                  badge={{ label: `${brand.carsCount} Listed Cars`, variant: 'neutral' }}
                  icon={Car}
                  actions={
                    <button
                      type="button"
                      onClick={() => handleOpenEditBrand(brand)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      title="Edit brand"
                    >
                      <Edit size={13} />
                    </button>
                  }
                />
                    <AccordionBody id={String(brand.id)}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                            Verified Platform Generations & Chassis Codes:
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenAddModel(brand)}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Plus size={13} />
                            <span>Add Model Spec</span>
                          </button>
                        </div>

                        {brand.activeModels.length === 0 ? (
                          <div style={{ padding: 16, background: 'var(--admin-bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--admin-text-muted)', textAlign: 'center' }}>
                            No vehicle models mapped yet. Click "Add Model Spec" above.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {brand.activeModels.map((model) => (
                              <div
                                key={model.id}
                                style={{
                                  padding: 14,
                                  background: '#ffffff',
                                  border: '1px solid var(--admin-border)',
                                  borderRadius: 'var(--radius-md)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 16,
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>{model.name}</span>
                                    <span className="badge badge-rust" style={{ fontSize: 11 }}>
                                      {model.chassis_code || model.chassisCode}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                    Years: {model.years} · Engines: {(model.engines || []).join(' · ')}
                                  </div>
                                </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="badge badge-success" style={{ fontSize: 11 }}>
                                {model.partsCount} Compatible Parts
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModel(brand, model)}
                                className="btn btn-secondary btn-sm"
                                title="Edit Model Spec"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteModel(brand.id, model.id)}
                                className="btn btn-danger btn-sm"
                                title="Delete Model Spec"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionBody>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}

          {/* Tab 2: Parts Categories */}
          {activeTab === 'categories' && (
            <Accordion defaultOpen={categories.slice(0, 2).map((c) => String(c.id))}>
              {categories.map((cat) => (
                <AccordionItem key={cat.id} id={String(cat.id)}>
                  <AccordionHeader
                    id={String(cat.id)}
                    title={cat.name}
                    subtitle={`Taxonomy Code: ${cat.code} · ${cat.subcategories.length} Sub-Component Specs`}
                    badge={{ label: `${cat.parts} Catalog Items`, variant: 'success' }}
                    icon={Layers}
                  />
                  <AccordionBody id={String(cat.id)}>
                    <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>
                        Subcategory Classifications:
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="btn btn-danger btn-sm"
                        >
                          <Trash2 size={13} /> Delete Category
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                      {cat.subcategories.map((sub, idx) => {
                        const subName = sub.name || sub
                        return (
                          <div
                            key={sub.id ?? idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 14px',
                              background: 'var(--admin-bg-subtle)',
                              border: '1px solid var(--admin-border)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--admin-text-primary)',
                            }}
                          >
                            <CheckCircle2 size={14} style={{ color: '#047857' }} />
                            <span>{subName}</span>
                            {sub.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSubcategory(cat, sub)}
                                title={`Remove ${subName}`}
                                style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'inline-flex', padding: 2 }}
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="New subcategory name…"
                        value={subDrafts[cat.id] || ''}
                        onChange={(e) => setSubDrafts({ ...subDrafts, [cat.id]: e.target.value })}
                        style={{ maxWidth: 320 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubcategory(cat)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Plus size={13} /> Add Sub
                      </button>
                    </div>
                    </div>
                  </AccordionBody>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </>
      )}

      {/* Add Brand Modal */}
      {brandModalOpen && (
        <div className="modal-backdrop" onClick={() => setBrandModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingBrand ? `Edit Brand — ${editingBrand.brand}` : 'Register New Vehicle Brand'}</h3>
              <button type="button" onClick={() => { setBrandModalOpen(false); setEditingBrand(null) }} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddBrand}>
              <div className="modal-body" style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Brand / Manufacturer Name *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Subaru, Mitsubishi, BMW, Honda"
                    value={newBrandForm.brand}
                    onChange={(e) => setNewBrandForm({ ...newBrandForm, brand: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">Country of Origin</label>
                  <select
                    className="admin-input"
                    value={newBrandForm.country}
                    onChange={(e) => setNewBrandForm({ ...newBrandForm, country: e.target.value })}
                  >
                    <option value="Japan">Japan</option>
                    <option value="Germany">Germany</option>
                    <option value="United States">United States</option>
                    <option value="Italy">Italy</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="France">France</option>
                    <option value="South Korea">South Korea</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setBrandModalOpen(false); setEditingBrand(null) }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingBrand ? 'Save Changes' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {modelModalOpen && targetBrand && (
        <div className="modal-backdrop" onClick={() => setModelModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingModel ? `Edit Model — ${editingModel.model.name}` : <>Add Model to {targetBrand.brand}</>}</h3>
              <button type="button" onClick={() => { setModelModalOpen(false); setEditingModel(null) }} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddModel}>
              <div className="modal-body" style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Model Name *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Impreza WRX STI (GC8 / GDB / VAB)"
                    value={newModelForm.name}
                    onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label className="admin-label">Years / Generation</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. 1994 - 2000"
                      value={newModelForm.years}
                      onChange={(e) => setNewModelForm({ ...newModelForm, years: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Chassis Code *</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. GC8 / GDB"
                      value={newModelForm.chassisCode}
                      onChange={(e) => setNewModelForm({ ...newModelForm, chassisCode: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Engines (comma separated)</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. EJ207 2.0L Turbo, EJ257 2.5L Turbo"
                    value={newModelForm.engines}
                    onChange={(e) => setNewModelForm({ ...newModelForm, engines: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setModelModalOpen(false); setEditingModel(null) }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingModel ? 'Save Changes' : 'Add Model Platform'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {categoryModalOpen && (
        <div className="modal-backdrop" onClick={() => { setCategoryModalOpen(false); setEditingCategory(null) }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingCategory ? `Edit Category — ${editingCategory.name}` : 'Create Parts Catalog Category'}</h3>
              <button type="button" onClick={() => { setCategoryModalOpen(false); setEditingCategory(null) }} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="modal-body" style={{ padding: 24 }}>
                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Category Name *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Aero, Body Kits & Carbon Fiber"
                    value={newCategoryForm.name}
                    onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="admin-label">Taxonomy Code *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. AERO-CF"
                    value={newCategoryForm.code}
                    onChange={(e) => setNewCategoryForm({ ...newCategoryForm, code: e.target.value })}
                    required
                  />
                </div>

                {!editingCategory && (
                <div>
                  <label className="admin-label">Subcategories (comma separated)</label>
                  <textarea
                    rows={3}
                    className="admin-input"
                    placeholder="e.g. Carbon Hoods, GT Wings & Spoilers, Widebody Overfenders, Front Splitters"
                    value={newCategoryForm.subcategories}
                    onChange={(e) => setNewCategoryForm({ ...newCategoryForm, subcategories: e.target.value })}
                  />
                </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setCategoryModalOpen(false); setEditingCategory(null) }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
