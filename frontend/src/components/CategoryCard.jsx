import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import './Cards.css'

export default function CategoryCard({ category, className = '' }) {
  if (!category) return null

  const { id, name, count, icon: Icon, img, link } = category
  const targetLink = link || `/parts?category=${id}`

  return (
    <Link to={targetLink} className={`category-card ${className}`}>
      <img src={img} alt={name} className="category-img" loading="lazy" />
      <div className="category-overlay">
        {Icon && (
          <div className="category-icon-wrapper">
            <Icon size={22} />
          </div>
        )}
        <div className="category-meta">
          <h3 className="category-name">{name}</h3>
          {count && <span className="category-count">{count}</span>}
        </div>
        <div className="category-arrow">
          <ArrowUpRight size={18} />
        </div>
      </div>
    </Link>
  )
}
