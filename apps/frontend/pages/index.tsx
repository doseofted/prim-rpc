import Head from 'next/head'
import { Docs } from "@doseofted/prim-ui/react"
import docs from "@doseofted/prim-example/dist/docs.json"

export default function Home() {
  return (
    <div>
      <Head>
        <title>Hi</title>
      </Head>
      <div className='bg-gray-100'>
        <Docs docs={docs} />
      </div>
    </div>
  )
}
