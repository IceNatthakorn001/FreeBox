type CardProps = {
    title: string
    description: string
}

function Card({ title, description}: CardProps) {
    return (
        <div className="card">
            <h2>{title}</h2>
            <p>{description}</p>
        </div>
    )
}

export default Card